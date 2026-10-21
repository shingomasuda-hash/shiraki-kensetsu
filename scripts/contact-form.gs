/**
 * 白木建設 採用LP お問い合わせフォーム受信スクリプト（Google Apps Script）
 *
 * やること:
 *   1. スプレッドシートへ1行追記（データのバックアップ）
 *   2. 採用担当へ通知メールを送信
 *   3. お問い合わせくださった方へ自動返信メールを送信
 *
 * ===== 設置手順 =====
 *  1. Googleドライブで新しいスプレッドシートを作る（名前は「白木建設 採用 お問い合わせ」など）
 *  2. そのスプレッドシートで「拡張機能 > Apps Script」を開く
 *  3. エディタの中身をすべて消し、このファイルの内容を貼り付ける
 *  4. 左の「ファイル」の「＋」→「スクリプト」で「設定」という名前のファイルを作り、
 *     contact-form-settings.gs の内容を貼り付けて、宛先と合言葉を入力する
 *     （設定を別ファイルにしているのは、本体を更新しても設定が消えないようにするため）
 *  5. 右上の「デプロイ > 新しいデプロイ」を選ぶ
 *       種類            : ウェブアプリ
 *       次のユーザーとして実行 : 自分
 *       アクセスできるユーザー : 全員
 *  6. 表示された「ウェブアプリのURL」をコピーする
 *  7. Vercelの環境変数へ設定する
 *       CONTACT_FORWARD_URL   = コピーしたURL
 *       CONTACT_SHARED_SECRET = 設定.gs の SHARED_SECRET と同じ文字列
 *  8. 再デプロイすると、フォームの送信ボタンが有効になる
 *
 * ※ 初回デプロイ時に「このアプリはGoogleで確認されていません」と出ますが、
 *    ご自身で作成したスクリプトのため「詳細 > 安全でないページに移動」で進めて問題ありません。
 * ※ スクリプトを修正したときは「デプロイ > デプロイを管理 > 編集 > 新バージョン」で更新してください。
 *    （新規デプロイにするとURLが変わります）
 * ※ 本体（このファイル）を貼り替えるときも、「設定」ファイルはそのままにしてください。
 */

/**
 * 設定の読み取り。
 *
 * 値は別ファイル（設定.gs）で定義している。本体を貼り替えても設定が
 * 消えないようにするため。設定ファイルがまだ無い場合も動くよう、
 * ここで既定値を補っている。
 */
function config() {
  return {
    notifyTo: typeof NOTIFY_TO !== 'undefined' && NOTIFY_TO ? String(NOTIFY_TO) : '',
    secret: typeof SHARED_SECRET !== 'undefined' && SHARED_SECRET ? String(SHARED_SECRET) : '',
    sheetName:
      typeof SHEET_NAME !== 'undefined' && SHEET_NAME ? String(SHEET_NAME) : 'お問い合わせ',
    senderName:
      typeof SENDER_NAME !== 'undefined' && SENDER_NAME
        ? String(SENDER_NAME)
        : '白木建設株式会社 採用担当',
    signature:
      typeof COMPANY_SIGNATURE !== 'undefined' && COMPANY_SIGNATURE
        ? String(COMPANY_SIGNATURE)
        : '',
    isBackup: typeof IS_BACKUP !== 'undefined' && IS_BACKUP === true,
    settingsFileFound: typeof NOTIFY_TO !== 'undefined',
  };
}

var HEADERS = [
  '受信日時',
  'お名前',
  'フリガナ',
  '生年月日',
  '生年月日(YYYY-MM-DD)',
  '性別',
  '電話番号',
  'メールアドレス',
  'メッセージ',
  'メール送信',
];

function doGet() {
  return json({ ok: true, message: 'contact form endpoint' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty_body' });
    }

    var data = JSON.parse(e.postData.contents);

    var cfg = config();
    if (cfg.secret && data.secret !== cfg.secret) {
      return json({ ok: false, error: 'forbidden' });
    }

    var record = {
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
      name: String(data.name || ''),
      kana: String(data.kana || ''),
      birthday: String(data.birthday || ''),
      birthdayIso: String(data.birthdayIso || ''),
      gender: String(data.gender || ''),
      tel: String(data.tel || ''),
      email: String(data.email || ''),
      message: String(data.message || ''),
      // Vercel が本番へ届かず控えへ回したときに true で届く
      viaBackup: data.viaBackup === true,
    };

    if (!record.name || !record.email) {
      return json({ ok: false, error: 'missing_fields' });
    }

    // 1. スプレッドシートへ保存（メール送信が失敗しても記録は残す）
    appendRow(record, '送信中');

    // 2. 担当者への通知と、本人への自動返信
    //    どちらも、失敗しても記録は残したいので個別に捕まえて結果を書き戻す
    //
    //    控え側も通知を送る。Vercel は本番へ届かなかったときだけ控えへ回すので、
    //    控えに届いた時点で二重ではなく「本番が落ちている」知らせになるため。
    var results = [
      sendSafely(function () { return notifyStaff(record); }, '通知'),
      sendSafely(function () { return replyToSender(record); }, '自動返信'),
    ];
    updateLastMailStatus(results.join(' / '));

    return json({ ok: true });
  } catch (error) {
    // 失敗の記録を残しておく（デバッグ用。実行ログからも確認できます）
    console.error(error);
    return json({ ok: false, error: String(error) });
  }
}

/** 書き込み先シートを返す（無ければ見出し付きで作成する） */
function getSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var name = config().sheetName;
  var sheet = book.getSheetByName(name);

  if (!sheet) {
    sheet = book.insertSheet(name);
  }

  if (sheet.getLastRow() > 0) {
    // 以前の見出しのままなら更新する（列数は同じなのでデータはずれない）
    var current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (current.join('\t') !== HEADERS.join('\t')) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var header = sheet.getRange(1, 1, 1, HEADERS.length);
    header.setFontWeight('bold').setBackground('#e8f5ec');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(9, 420);
  }

  return sheet;
}

function appendRow(record, replyStatus) {
  var sheet = getSheet();
  sheet.appendRow([
    record.submittedAt,
    record.name,
    record.kana,
    record.birthday,
    record.birthdayIso,
    record.gender,
    record.tel,
    record.email,
    record.message,
    replyStatus,
  ]);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('yyyy/MM/dd HH:mm:ss');
}

function updateLastMailStatus(status) {
  var sheet = getSheet();
  sheet.getRange(sheet.getLastRow(), HEADERS.length).setValue(status);
}

/**
 * メール送信を1件試し、結果を短い文字列で返す（シートに残す用）。
 * send が文字列を返した場合は、その内容も添える（宛先ごとの結果など）。
 */
function sendSafely(send, label) {
  try {
    var detail = send();
    return label + ':送信済み' + (detail ? '（' + detail + '）' : '');
  } catch (error) {
    console.error(label + ' の送信に失敗しました: ' + error);
    return label + ':失敗(' + error + ')';
  }
}

/**
 * 通知先の文字列を宛先の配列にする。
 *
 * カンマ・セミコロン・改行・全角の読点など、どの区切りで書かれていても
 * 拾えるようにしている（設定の書き方で通知が1件も届かなくなるのを防ぐため）。
 */
function recipients(raw) {
  return String(raw || '')
    .split(/[,;\s、，]+/)
    .map(function (value) {
      return value.trim();
    })
    .filter(function (value) {
      return value.indexOf('@') > 0;
    });
}

/**
 * 採用担当への通知メール（管理用）。
 *
 * スプレッドシートのリンクなど、管理側だけが見るべき内容が入るため、
 * 応募者のアドレスは宛先にも返信先にも入れない。
 * 返信先を応募者にしていると、担当者が「返信」を押したときに
 * この管理用の本文がそのまま応募者へ渡ってしまうため。
 *
 * 宛先は1件ずつ別々に送る。まとめて送ると、1つの宛先で弾かれたときに
 * ほかの宛先にも届かなくなるため。どこへ届いたかは戻り値でシートに残す。
 */
function notifyStaff(record) {
  var cfg = config();
  var to = recipients(cfg.notifyTo);
  if (to.length === 0) {
    // 黙って送られないままになるのを防ぐため、はっきり失敗させる
    throw new Error('NOTIFY_TO（通知メールの宛先）が設定されていません。設定.gs を確認してください');
  }

  // 控えが受け取った応募は、本番へ届かなかったということ。
  // 気づかないまま放置されないよう、件名と本文の先頭で知らせる。
  var viaBackup = cfg.isBackup || record.viaBackup === true;

  var lines = viaBackup
    ? [
        '【ご注意】本番の受信先へ届かなかったため、控えがこの応募を受け取りました。',
        '応募内容は控えのスプレッドシート（下記リンク）に残っています。',
        '本番側の Apps Script のデプロイと、Vercel の CONTACT_FORWARD_URL を確認してください。',
        '',
      ]
    : [];

  lines = lines.concat([
    '採用LPの応募フォームから新しい応募がありました。',
    '',
    '受信日時　　　: ' + formatDate(record.submittedAt),
    'お名前　　　　: ' + record.name,
    'フリガナ　　　: ' + record.kana,
    '生年月日　　　: ' + record.birthday + (record.birthdayIso ? '（' + record.birthdayIso + '）' : ''),
    '性別　　　　　: ' + record.gender,
    '電話番号　　　: ' + record.tel,
    'メールアドレス: ' + record.email,
    '',
    '【メッセージ】',
    record.message,
    '',
    '────────────────────',
    '応募者へは、受付のお礼メールを自動でお送りしています。',
    'ご連絡の際は ' + record.email + ' 宛に新しいメールを作成してください。',
    '',
    '※ このメールは管理用です。スプレッドシートのリンクを含むため、',
    '　 応募者への転送・返信には使わないでください。',
    '',
    'スプレッドシート: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  ]);

  var subject = viaBackup
    ? '【採用LP・控えが受信】応募がありました: ' + record.name + ' 様'
    : '【採用LP】応募がありました: ' + record.name + ' 様';

  var sent = [];
  var failed = [];

  for (var i = 0; i < to.length; i += 1) {
    try {
      MailApp.sendEmail({
        to: to[i],
        subject: subject,
        body: lines.join('\n'),
        name: cfg.senderName,
      });
      sent.push(to[i]);
    } catch (error) {
      failed.push(to[i] + '(' + error + ')');
    }
  }

  if (sent.length === 0) {
    throw new Error('どの宛先にも送れませんでした: ' + failed.join(' / '));
  }

  if (failed.length > 0) {
    return sent.join(' ') + ' へ送信 / 届かなかった宛先: ' + failed.join(' / ');
  }

  return sent.join(' ');
}

/**
 * 応募者へのお礼メール（受付完了のお知らせ）。
 *
 * 応募者が受け取るのはこのメールだけ。管理用の情報（スプレッドシートの
 * リンクなど）は一切載せない。
 *
 * 返信先は採用担当（NOTIFY_TO の先頭）にしておく。応募者が返信したときに、
 * スクリプトの持ち主のアドレスではなく採用担当へ届くようにするため。
 */
function replyToSender(record) {
  var cfg = config();
  var staff = recipients(cfg.notifyTo);

  var lines = [
    record.name + ' 様',
    '',
    'この度は白木建設株式会社の採用にご応募いただき、',
    '誠にありがとうございます。',
    '',
    '下記の内容で、たしかに受け付けいたしました。',
    'ご応募いただいたことに、あらためて御礼申し上げます。',
    '',
    '【今後の流れ】',
    '　1. 採用担当にて、ご応募の内容を確認いたします。',
    '　2. 3営業日以内に、担当者よりお電話またはメールでご連絡いたします。',
    '　3. ご都合をうかがったうえで、面談・現場見学へお進みいただきます。',
    '',
    '　お急ぎの事情がある場合や、ご連絡のつきやすい時間帯がある場合は、',
    '　このメールにそのままご返信ください。採用担当へ届きます。',
    '',
    '【ご応募の内容】',
    '────────────────────',
    'お名前　　　　: ' + record.name,
    'フリガナ　　　: ' + record.kana,
    '生年月日　　　: ' + record.birthday,
    '性別　　　　　: ' + record.gender,
    '電話番号　　　: ' + record.tel,
    'メールアドレス: ' + record.email,
    '',
    '【メッセージ】',
    record.message,
    '────────────────────',
    '',
    'お会いできますことを、担当者一同楽しみにしております。',
    'どうぞよろしくお願いいたします。',
    '',
    '※ このメールは、ご応募を受け付けた時点で自動的にお送りしています。',
    '　 3営業日を過ぎてもご連絡がない場合や、お心当たりのない場合は、',
    '　 お手数ですがこのメールへご返信ください。',
    '',
    cfg.signature,
  ];

  var options = {
    to: record.email,
    subject: '【白木建設株式会社】ご応募ありがとうございます（受付完了）',
    body: lines.join('\n'),
    name: cfg.senderName,
  };

  if (staff.length > 0) {
    options.replyTo = staff[0];
  }

  MailApp.sendEmail(options);
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * 設定の確認用。エディタ上でこの関数を実行し、下の「実行ログ」を見てください。
 * 宛先の設定漏れや、その日に送れるメールの残り通数が分かります。
 */
function checkSettings() {
  var cfg = config();
  var lines = [];

  if (!cfg.settingsFileFound) {
    lines.push('× 設定ファイル（設定.gs）が見つかりません。作成してください。');
  }

  var to = recipients(cfg.notifyTo);

  if (cfg.isBackup) {
    lines.push('○ 控え（バックアップ）として設定されています。');
    lines.push('　 本番へ届かなかった応募だけがここに入ります。');
    lines.push('　 そのときの通知メールは、件名に「控えが受信」と付きます。');
  }

  if (to.length === 0) {
    lines.push('× NOTIFY_TO に使えるメールアドレスがありません: 「' + cfg.notifyTo + '」');
    lines.push('　 複数の宛先はカンマ区切りで1つの文字列にしてください。');
    lines.push("　 例: var NOTIFY_TO = 'a@example.com,b@example.com';");
  } else {
    lines.push('○ 通知メールの宛先は ' + to.length + ' 件です（1件ずつ別々に送ります）');
    for (var i = 0; i < to.length; i += 1) {
      lines.push('　 ' + (i + 1) + '. ' + to[i]);
    }
    lines.push('　 ※ 届かないときは、宛先側の「迷惑メール」と「すべてのメール」も見てください。');
  }

  if (!cfg.secret) {
    lines.push('△ SHARED_SECRET が空です。URLを知っていれば誰でも送信できる状態です。');
  } else {
    lines.push('○ 合言葉は設定済みです（Vercel の CONTACT_SHARED_SECRET と同じ値か確認してください）');
  }

  try {
    lines.push('○ 本日あと ' + MailApp.getRemainingDailyQuota() + ' 通送信できます');
  } catch (error) {
    lines.push('× メールの権限がありません。一度 testSubmission を実行して承認してください: ' + error);
  }

  var message = lines.join('\n');
  Logger.log(message);
  return message;
}

/**
 * メールを使わない設置確認用。
 *
 * スプレッドシートへの書き込みだけを1回試します。
 * メールの残り通数を使いたくないときや、書き込み先だけ確かめたいときに。
 * シートに行が増えれば設置できています（テスト行は手で削除してください）。
 */
function testSheetOnly() {
  appendRow(
    {
      submittedAt: new Date(),
      name: 'テスト 太郎',
      kana: 'テスト タロウ',
      birthday: '1998年4月1日',
      birthdayIso: '1998-04-01',
      gender: '男性',
      tel: '090-1234-5678',
      email: 'test@example.com',
      message: 'これは控えの設置確認用のテスト行です。',
    },
    'テスト（メールは送っていません）'
  );

  var message =
    'シートにテスト行を追加しました。確認できたら、その行を手で削除してください。';
  Logger.log(message);
  return message;
}

/**
 * 設置確認用。エディタ上でこの関数を実行すると、
 * シートへのテスト行の追加と、通知・自動返信メールの送信を1回試します。
 * 通知メールの宛先に届けば設定は完了です（テスト行は手で削除してください）。
 *
 * 控え側で実行したときは、通知メールの件名に「控えが受信」が付きます。
 * これは本番が落ちたときに届く形と同じです。
 */
function testSubmission() {
  var cfg = config();
  var to = recipients(cfg.notifyTo);
  if (to.length === 0) {
    throw new Error(
      'NOTIFY_TO（通知メールの宛先）が未設定です。設定.gs を作成・入力してから実行してください。'
    );
  }

  doPost({
    postData: {
      contents: JSON.stringify({
        secret: cfg.secret,
        name: 'テスト 太郎',
        kana: 'テスト タロウ',
        birthday: '1998年4月1日',
        birthdayIso: '1998-04-01',
        gender: '男性',
        tel: '090-1234-5678',
        email: to[0],
        message: 'これは設置確認用のテスト送信です。',
        submittedAt: new Date().toISOString(),
      }),
    },
  });
}
