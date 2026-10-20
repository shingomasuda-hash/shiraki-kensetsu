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
 *  4. 下の設定（NOTIFY_TO / SHARED_SECRET）を書き換えて保存する
 *  5. 右上の「デプロイ > 新しいデプロイ」を選ぶ
 *       種類            : ウェブアプリ
 *       次のユーザーとして実行 : 自分
 *       アクセスできるユーザー : 全員
 *  6. 表示された「ウェブアプリのURL」をコピーする
 *  7. Vercelの環境変数へ設定する
 *       CONTACT_FORWARD_URL   = コピーしたURL
 *       CONTACT_SHARED_SECRET = 下の SHARED_SECRET と同じ文字列
 *  8. 再デプロイすると、フォームの送信ボタンが有効になる
 *
 * ※ 初回デプロイ時に「このアプリはGoogleで確認されていません」と出ますが、
 *    ご自身で作成したスクリプトのため「詳細 > 安全でないページに移動」で進めて問題ありません。
 * ※ スクリプトを修正したときは「デプロイ > デプロイを管理 > 編集 > 新バージョン」で更新してください。
 *    （新規デプロイにするとURLが変わります）
 */

// ===== 設定 ===============================================================

/** 通知メールの宛先。カンマ区切りで複数指定できます。 */
var NOTIFY_TO = '';

/** Vercel の CONTACT_SHARED_SECRET と同じ文字列。空にすると認証なしになります。 */
var SHARED_SECRET = '';

/** 書き込み先シート名。無ければ自動で作成します。 */
var SHEET_NAME = 'お問い合わせ';

/** メールの差出人名 */
var SENDER_NAME = '白木建設株式会社 採用担当';

/** 自動返信メールの署名に入れる会社情報 */
var COMPANY_SIGNATURE = [
  '────────────────────',
  '白木建設株式会社 採用担当',
  '────────────────────',
].join('\n');

// ==========================================================================

var HEADERS = [
  '受信日時',
  'お名前',
  'フリガナ',
  '生年月日',
  '生年月日(YYYY-MM-DD)',
  '電話番号',
  'メールアドレス',
  'メッセージ',
  '自動返信',
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

    if (SHARED_SECRET && data.secret !== SHARED_SECRET) {
      return json({ ok: false, error: 'forbidden' });
    }

    var record = {
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
      name: String(data.name || ''),
      kana: String(data.kana || ''),
      birthday: String(data.birthday || ''),
      birthdayIso: String(data.birthdayIso || ''),
      tel: String(data.tel || ''),
      email: String(data.email || ''),
      message: String(data.message || ''),
    };

    if (!record.name || !record.email) {
      return json({ ok: false, error: 'missing_fields' });
    }

    // 1. スプレッドシートへ保存（メール送信が失敗しても記録は残す）
    var replyResult = '';
    appendRow(record, '送信中');

    // 2. 担当者への通知
    notifyStaff(record);

    // 3. 本人への自動返信
    try {
      replyToSender(record);
      replyResult = '送信済み';
    } catch (replyError) {
      replyResult = '失敗: ' + replyError;
    }

    updateLastReplyStatus(replyResult);

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
  var sheet = book.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var header = sheet.getRange(1, 1, 1, HEADERS.length);
    header.setFontWeight('bold').setBackground('#e8f5ec');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(8, 420);
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
    record.tel,
    record.email,
    record.message,
    replyStatus,
  ]);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('yyyy/MM/dd HH:mm:ss');
}

function updateLastReplyStatus(status) {
  var sheet = getSheet();
  sheet.getRange(sheet.getLastRow(), HEADERS.length).setValue(status);
}

function notifyStaff(record) {
  if (!NOTIFY_TO) {
    return;
  }

  var lines = [
    '採用LPのお問い合わせフォームから新しい応募がありました。',
    '',
    '受信日時　　　: ' + formatDate(record.submittedAt),
    'お名前　　　　: ' + record.name,
    'フリガナ　　　: ' + record.kana,
    '生年月日　　　: ' + record.birthday + (record.birthdayIso ? '（' + record.birthdayIso + '）' : ''),
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
    to: NOTIFY_TO,
    subject: '【採用LP】お問い合わせ: ' + record.name + ' 様',
    body: lines.join('\n'),
    name: SENDER_NAME,
    replyTo: record.email,
  });
}

function replyToSender(record) {
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
    COMPANY_SIGNATURE,
  ];

  MailApp.sendEmail({
    to: record.email,
    subject: '【白木建設株式会社】お問い合わせありがとうございます',
    body: lines.join('\n'),
    name: SENDER_NAME,
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
 * 設置確認用。エディタ上でこの関数を実行すると、
 * シートへのテスト行の追加と、通知・自動返信メールの送信を1回試します。
 * NOTIFY_TO 宛に届けば設定は完了です（テスト行は手で削除してください）。
 */
function testSubmission() {
  doPost({
    postData: {
      contents: JSON.stringify({
        secret: SHARED_SECRET,
        name: 'テスト 太郎',
        kana: 'テスト タロウ',
        birthday: '1998年4月1日',
        birthdayIso: '1998-04-01',
        tel: '090-1234-5678',
        email: NOTIFY_TO.split(',')[0],
        message: 'これは設置確認用のテスト送信です。',
        submittedAt: new Date().toISOString(),
      }),
    },
  });
}
