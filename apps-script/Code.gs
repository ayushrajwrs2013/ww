/**
 * WasteWise — Google Apps Script backend
 * =====================================================================
 * Stores survey responses in the Google Sheet this script is bound to.
 *
 * SETUP (see chat instructions):
 *   1. Create a Google Sheet
 *   2. Extensions > Apps Script  -> paste this file over Code.gs
 *   3. Deploy > New deployment > Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *   4. Copy the /exec URL and put it in config.js (WASTEWISE_API)
 * =====================================================================
 */

var ADMIN_KEY = '2gVaaxiSH4HL';
var SHEET_NAME = 'Responses';

var HEADERS = [
  'Timestamp', 'Name', 'Age', 'Gender', 'Occupation', 'Town',
  'Frequent Waste Types', 'Largest Waste', 'Segregate Waste',
  'Food Waste Handling', 'Plastic Harms Aquatic Life',
  'Useful Scientific Model', 'Other Details', 'Suggestion'
];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function out_(obj, callback) {
  var body = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();

    if (data.action === 'delete') {
      if (data.key !== ADMIN_KEY) return out_({ status: 'error', message: 'unauthorized' });
      var row = Number(data.id);
      if (row >= 2 && row <= sheet.getLastRow()) sheet.deleteRow(row);
      return out_({ status: 'success' });
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name || '',
      data.age != null ? String(data.age) : '',
      data.gender || '',
      data.occupation || '',
      data.town || '',
      data.wasteFrequent || '',
      data.wasteLargest || '',
      data.segregate || '',
      data.foodWaste || '',
      data.plasticHarm || '',
      data.modelUseful || '',
      data.otherDetails || '',
      data.suggestion || ''
    ]);
    return out_({ status: 'success' });
  } catch (err) {
    return out_({ status: 'error', message: String(err) });
  }
}

function doGet(e) {
  var p = e.parameter || {};
  var callback = p.callback;

  if (p.key !== ADMIN_KEY) return out_({ status: 'error', message: 'unauthorized' }, callback);

  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  var responses = [];

  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    values.forEach(function (row, i) {
      var o = {};
      HEADERS.forEach(function (h, c) {
        var v = row[c];
        if (h === 'Timestamp' && v instanceof Date) v = v.toISOString();
        o[h] = v == null ? '' : String(v);
      });
      o.id = i + 2;
      responses.push(o);
    });
    responses.reverse();
  }

  return out_({ status: 'success', count: responses.length, responses: responses }, callback);
}
