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
    };

    if (!record.name || !record.email) {
      return json({ ok: false, error: 'missing_fields' });
    }

    // 1. スプレッドシートへ保存（メール送信が失敗しても記録は残す）
    appendRow(record, '送信中');

    // 2. 担当者への通知と、本人への自動返信
    //    どちらも、失敗しても記録は残したいので個別に捕まえて結果を書き戻す
    var results = [
      // 控え側は通知を送らない（本番と二重に届くのを避けるため）
      cfg.isBackup
        ? '通知:送信しない設定（控え）'
        : sendSafely(function () { notifyStaff(record); }, '通知'),
      sendSafely(function () { replyToSender(record); }, '自動返信'),
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

/** メール送信を1件試し、結果を短い文字列で返す（シートに残す用） */
function sendSafely(send, label) {
  try {
    send();
    return label + ':送信済み';
  } catch (error) {
    console.error(label + ' の送信に失敗しました: ' + error);
    return label + ':失敗(' + error + ')';
  }
}

function notifyStaff(record) {
  var cfg = config();
  if (!cfg.notifyTo) {
    // 黙って送られないままになるのを防ぐため、はっきり失敗させる
    throw new Error('NOTIFY_TO（通知メールの宛先）が設定されていません。設定.gs を確認してください');
  }

  var lines = [
    '採用LPのお問い合わせフォームから新しい応募がありました。',
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
    'スプレッドシート: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  ];

  MailApp.sendEmail({
    to: cfg.notifyTo,
    subject: '【採用LP】お問い合わせ: ' + record.name + ' 様',
    body: lines.join('\n'),
    name: cfg.senderName,
    replyTo: record.email,
  });
}

function replyToSender(record) {
  var cfg = config();
  var lines = [
    record.name + ' 様',
    '',
    'この度は白木建設株式会社へお問い合わせいただき、誠にありがとうございます。',
    '以下の内容で受け付けいたしました。担当者より改めてご連絡いたします。',
    '',
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
    '※ このメールは自動送信です。ご返信いただいても確認できない場合があります。',
    '　 お急ぎの場合は、お手数ですが担当者からの連絡をお待ちください。',
    '',
    cfg.signature,
  ];

  MailApp.sendEmail({
    to: record.email,
    subject: '【白木建設株式会社】お問い合わせありがとうございます',
    body: lines.join('\n'),
    name: cfg.senderName,
  });
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

  if (cfg.isBackup) {
    lines.push('○ 控え（バックアップ）として設定されています。通知メールは送りません。');
    lines.push('　 動作確認は testSheetOnly を実行してください。');
  } else if (!cfg.notifyTo) {
    lines.push('× NOTIFY_TO が空です。通知メールの宛先を設定してください。');
  } else if (cfg.notifyTo.indexOf('@') === -1) {
    lines.push('× NOTIFY_TO がメールアドレスの形式ではありません: ' + cfg.notifyTo);
  } else {
    lines.push('○ 通知メールの宛先: ' + cfg.notifyTo);
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
 * 控え（バックアップ）側の設置確認用。
 *
 * メールは送らず、スプレッドシートへの書き込みだけを1回試します。
 * 控え側は NOTIFY_TO を空にしているため testSubmission が使えません。
 * こちらを実行し、シートに行が増えれば設置できています
 * （テスト行は手で削除してください）。
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
 */
function testSubmission() {
  var cfg = config();
  if (cfg.isBackup) {
    throw new Error(
      '控え（バックアップ）側は通知メールを送りません。代わりに testSheetOnly を実行してください。'
    );
  }
  if (!cfg.notifyTo) {
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
        email: cfg.notifyTo.split(',')[0],
        message: 'これは設置確認用のテスト送信です。',
        submittedAt: new Date().toISOString(),
      }),
    },
  });
}
