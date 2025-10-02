// ==UserScript==
// @name         HCMUS Schedule → Outlook Calendar (Manual, Fixed Newlines)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Đồng bộ lịch học HCMUS sang Outlook Calendar. Thêm nút vào từng dòng, mở Outlook trong tab mới (không thay thế trang gốc). Fix xuống dòng trong mô tả.
// @author       NamKha
// @match        https://*.hcmus.edu.vn/*SinhVien.aspx*
// @match        http://*.hcmus.edu.vn/*SinhVien.aspx*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const OUTLOOK_BASE = 'https://outlook.office.com/calendar/deeplink/compose';

  const TIME_MAP_CS2 = {
    '1': { start: '07:30', end: '08:20' }, '2': { start: '08:20', end: '09:10' },
    '2.5': { end: '09:35' }, '3': { start: '09:10', end: '10:00' },
    '3.5': { start: '09:45' }, '4': { start: '10:10', end: '11:00' },
    '5': { start: '11:00', end: '11:50' }, '6': { start: '12:40', end: '13:30' },
    '7': { start: '13:30', end: '14:20' }, '7.5': { end: '14:45' },
    '8': { start: '14:20', end: '15:10' }, '8.5': { start: '14:55' },
    '9': { start: '15:20', end: '16:10' }, '10': { start: '16:10', end: '17:00' },
  };

  const TIME_MAP_CS1 = {
    '1': { start: '07:00', end: '07:50' }, '2': { start: '07:50', end: '08:40' },
    '3': { start: '08:40', end: '09:30' }, '4': { start: '09:40', end: '10:30' },
    '5': { start: '10:30', end: '11:20' }, '6': { start: '11:20', end: '12:10' },
    '7': { start: '12:50', end: '13:40' }, '8': { start: '13:40', end: '14:30' },
    '9': { start: '14:30', end: '15:20' }, '10': { start: '15:30', end: '16:20' },
    '11': { start: '16:20', end: '17:10' }, '12': { start: '17:10', end: '18:00' },
    '13': { start: '18:00', end: '18:50' }, '14': { start: '18:50', end: '19:40' },
    '15': { start: '19:40', end: '20:30' }
  };

  const WDAY_MAP = { 'T2': 1, 'T3': 2, 'T4': 3, 'T5': 4, 'T6': 5, 'T7': 6, 'CN': 0 };

  const log = (...args) => console.log('[HCMUS→Outlook]', ...args);

  function waitForTable(tableId, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      const checkNow = () => {
        const table = document.getElementById(tableId);
        if (table && table.querySelector('tbody tr')) {
          return resolve(table);
        }
        if (performance.now() - start > timeoutMs) {
          return reject(new Error('Timeout waiting for schedule table'));
        }
      };
      checkNow();
      const obs = new MutationObserver(() => {
        checkNow();
        const table = document.getElementById(tableId);
        if (table && table.querySelector('tbody tr')) {
          obs.disconnect();
          resolve(table);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  function addCalendarColumn(table) {
    if (table.querySelector('th[data-userscript-column="true"]')) return;

    const headerRow = table.querySelector('thead tr') || table.createTHead().insertRow();
    const newHeader = document.createElement('th');
    newHeader.className = 'ui-state-default';
    newHeader.innerHTML = '<div class="DataTables_sort_wrapper" style="cursor: pointer;">Outlook Calendar</div>';
    newHeader.setAttribute('data-userscript-column', 'true');
    newHeader.style.width = '150px';
    headerRow.appendChild(newHeader);

    table.querySelectorAll('tbody tr').forEach(row => {
      row.appendChild(document.createElement('td')).className = 'center';
    });
  }

  function parseScheduleString(scheduleStr) {
    const regex = /(T[2-7]|CN)\(([\d.]+)\-([\d.]+)\)(?:-P\.(cs[12]):(.+))?/;
    const match = scheduleStr.match(regex);
    if (!match) return null;
    const [, day, startPeriod, endPeriod, campus, room] = match;
    const campusId = campus || 'cs2';
    const location = campus ? `Cơ sở ${campus.replace('cs', '')}, Phòng ${room.trim()}` : 'N/A';
    return { day, startPeriod, endPeriod, location, campusId };
  }

  function formatDateISO(date, time) {
    const [hours, minutes] = time.split(':');
    const pad = n => String(n).padStart(2, '0');
    const d = new Date(date);
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }

  function createOutlookCalendarLink(info) {
    const { fullSubjectName, day, startPeriod, endPeriod, location, scheduleStr, campusId, startDateText, subjectCode, classGroup } = info;
    const timeMap = campusId === 'cs1' ? TIME_MAP_CS1 : TIME_MAP_CS2;
    const startTime = timeMap[startPeriod]?.start ?? timeMap[Math.ceil(parseFloat(startPeriod))]?.start;
    const endTime   = timeMap[endPeriod]?.end     ?? timeMap[Math.floor(parseFloat(endPeriod))]?.end;
    const weekdayNum = WDAY_MAP[day];

    if (!startTime || !endTime || weekdayNum === undefined) {
      log('Bỏ qua lịch không hợp lệ:', { scheduleStr, startTime, endTime });
      return null;
    }

    const today = new Date();
    const firstPossibleDate = new Date();

    if (startDateText) {
      const [dayStr, monthStr, yearStr] = startDateText.split('/');
      const baseStartDate = new Date(`${yearStr}-${monthStr}-${dayStr}T00:00:00`);
      const baseStartDayIndex = baseStartDate.getDay();
      let dayDifference = weekdayNum - baseStartDayIndex;
      if (dayDifference < 0) dayDifference += 7;
      firstPossibleDate.setTime(baseStartDate.getTime());
      firstPossibleDate.setDate(baseStartDate.getDate() + dayDifference);
    } else {
      const currentDayIndex = today.getDay();
      let dayDifference = weekdayNum - currentDayIndex;
      if (dayDifference < 0) dayDifference += 7;
      firstPossibleDate.setDate(today.getDate() + dayDifference);
    }

    const startDateStr = formatDateISO(firstPossibleDate, startTime);
    const endDateStr = formatDateISO(firstPossibleDate, endTime);
    const description =
      `Mã MH: ${subjectCode}\r\n` +
      `Lớp/Nhóm: ${classGroup}\r\n` +
      `Lịch học gốc: ${scheduleStr}\r\n` +
      `* Nếu muốn lặp lại, hãy chỉnh "Repeat" ở Outlook Calendar!`;

    const url = new URL(OUTLOOK_BASE);
    url.searchParams.set('subject', fullSubjectName);
    url.searchParams.set('body', description);
    url.searchParams.set('location', location);
    url.searchParams.set('startdt', startDateStr);
    url.searchParams.set('enddt', endDateStr);
    return url.toString();
  }

  function processAndGenerateLinks(table) {
    const config = {
      tableId: 'tbSVKQ', subjectCodeIndex: 0, nameIndex: 1, classGroupIndex: 2,
      classTypeIndex: 4, scheduleIndex: 5, startDateIndex: 6,
    };

    addCalendarColumn(table);

    table.querySelectorAll('tbody tr').forEach(row => {
      if (row.cells.length === table.querySelectorAll('thead th').length - 1) {
        row.appendChild(document.createElement('td')).className = 'center';
      }

      const calendarCell = row.cells[row.cells.length - 1];
      if (!calendarCell) return;
      if (calendarCell.innerHTML !== '') return;

      const subjectCode = row.cells[config.subjectCodeIndex]?.textContent.trim() || '';
      const subjectName = row.cells[config.nameIndex]?.textContent.trim() || '';
      const classType = row.cells[config.classTypeIndex]?.textContent.trim() || '';
      const classGroup = row.cells[config.classGroupIndex]?.textContent.trim() || '';
      const scheduleStr = row.cells[config.scheduleIndex]?.textContent.trim() || '';
      const startDateText = row.cells[config.startDateIndex]?.textContent.trim() || null;
      const fullSubjectName = classType ? `${subjectName} (${classType})` : subjectName;

      scheduleStr.split(';').map(s => s.trim()).forEach(part => {
        const parsed = parseScheduleString(part);
        if (!parsed) return;
        const link = createOutlookCalendarLink({ ...parsed, fullSubjectName, scheduleStr: part, startDateText, subjectCode, classGroup });
        if (!link) return;

        const a = document.createElement('a');
        a.href = link;
        a.textContent = 'Thêm vào Outlook';
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
        a.title = `Thêm '${fullSubjectName}' vào Outlook Calendar`;
        a.style.cssText = 'padding:4px;display:inline-block;background:#eee;border:1px solid #ccc;border-radius:4px;';
        calendarCell.appendChild(a);
      });
    });
  }

  waitForTable('tbSVKQ').then((table) => {
    log('Tìm thấy bảng thời khóa biểu, bắt đầu xử lý...');
    processAndGenerateLinks(table);
  }).catch(err => {
    console.error('[HCMUS→Outlook] Không tìm thấy bảng thời khóa biểu:', err);
  });

})();
