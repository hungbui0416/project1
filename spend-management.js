document.getElementById('query-type-select').addEventListener('change', function () {
  const select = this;
  const firstOption = select.querySelector('option[value="0"]');

  if (select.value !== "0" && firstOption) {
    firstOption.style.display = 'none';
  }
});

document.querySelector('.js-add-spend-button').addEventListener('click', () => {
  addSpend();
});

document.querySelector('.js-search-button').addEventListener('click', () => {
  search();
});

const spendList = [{
   name: 'Tiền ăn trưa',
   amount: 35000,
   date: '2024-12-23'
}, {
  name: 'Tiền đổ xăng',
  amount: 70000,
  date: '2024-12-21'
}, {
  name: 'Tiền sửa xe',
  amount: 1000000,
  date: '2024-06-01'
}, {
  name: 'Tiền ăn sáng', 
  amount: 20000,
  date: '2024-08-03'
}];

const N = 1e5;
const INF = 1e9;
const STARTDATE = 1999 * 366 + 12 * 31 + 31; // 01/01/2000
const spendOn = new Map();
const PS = new Array(N);
const ST = new Array(N * 4);
const RM = new Array(N).fill(null).map(() => new Array(Math.ceil(Math.log2(N))).fill(0));
let recomputePS = true;
let rebuildST = true;
let recomputeRM = true;

spendList.forEach((spendObject, index) => {
  spendOn.set(convertDate(spendObject.date), spendObject.amount);
});

renderSpendList();

function search() {
  const resultElement = document.querySelector('.js-result-paragraph');

  const startDateInputElement = document.querySelector('.js-start-date-input');
  const startDate = startDateInputElement.value;

  const endDateInputElement = document.querySelector('.js-end-date-input');
  const endDate = endDateInputElement.value;

  const queryTypeContainer = document.querySelector('.js-query-type-container').querySelector('select');
  const queryType = queryTypeContainer.value;

  if (queryType === '1') {
    resultElement.innerHTML = Intl.NumberFormat('en-US').format(totalSpend(startDate, endDate)) + ' VND';
  }
  else if (queryType === '2') {
    resultElement.innerHTML = Intl.NumberFormat('en-US').format(getMax(startDate, endDate)) + ' VND';
  }
  else if (queryType === '3') {
    resultElement.innerHTML = Intl.NumberFormat('en-US').format(getMin(startDate, endDate)) + ' VND';
  }
}

function computeRM() {
  for (let i = 1; i < N; i++) {
    RM[i][0] = (spendOn.get(i) || 0);
  }
  for (let j = 1; j <= Math.floor(Math.log2(N)); j++) {
    for (let i = 1; i + (1 << j) <= N; i++) {
      RM[i][j] = Math.max(RM[i][j - 1], RM[i + (1 << (j - 1))][j - 1]);
    }
  }
}

function getMax(startDate, endDate) {
  const start = convertDate(startDate);
  const end = convertDate(endDate);
  if (recomputeRM) {
    computeRM();
    recomputeRM = false;
  }
  const k = Math.floor(Math.log2(end - start + 1));
  return Math.max(RM[start][k], RM[end - (1 << k) + 1][k]);
}

function buildSegmentTree(id, start, end) {
  if (start === end) {
    ST[id] = spendOn.get(start) || INF;
    return;
  }
  const mid = Math.floor((start + end) / 2);
  buildSegmentTree(id * 2, start, mid);
  buildSegmentTree(id * 2 + 1, mid + 1, end);

  ST[id] = Math.min(ST[id * 2], ST[id * 2 + 1]);
}

function get(id, start, end, i, j) {
  if (j < start || i > end) {
    return INF;
  }
  if (i <= start && end <= j) {
    return ST[id];
  }
  const mid = Math.floor((start + end) / 2);
  return Math.min(get(id * 2, start, mid, i, j), get(id * 2 + 1, mid + 1, end, i, j));
}

function getMin(startDate, endDate) {
  if (rebuildST) {
    buildSegmentTree(1, 1, N - 1);
    rebuildST = false;
  }
  return get(1, 1, N - 1, convertDate(startDate), convertDate(endDate));
}

function computePS() {
  PS.fill(0);
  PS[0] = 0;
  for (let i = 1 ; i < N; i++) {
    PS[i] += PS[i - 1] + (spendOn.get(i) || 0);
  }
}

function totalSpend(startDate, endDate) {
  if (recomputePS) {
    computePS();
    recomputePS = false;
  }
  return PS[convertDate(endDate)] - PS[convertDate(startDate) - 1];
}

function convertDate(date) {
  const year = (date[0] - '0') * 1000 + (date[1] - '0') * 100 + (date[2] - '0') * 10 + (date[3] - '0');
  const month = (date[5] - '0') * 10 + (date[6] - '0');
  const day = (date[8] - '0') * 10 + (date[9] - '0');
  return year * 366 + month * 31 + day - STARTDATE;
}

function renderSpendList() {
  let spendListHTML = '';

  spendList.forEach((spendObject, index) => {
    const { name, amount, date } = spendObject;
    const html = `
      <div>${name}</div>
      <div>${Intl.NumberFormat('en-US').format(amount)} VND</div>
      <div>${date}</div>
      <button class="js-delete-spend-button delete-spend-button">Delete</button>
    `;
    spendListHTML += html;
  });

  document.querySelector('.js-spend-list').innerHTML = spendListHTML;

  document.querySelectorAll('.js-delete-spend-button').forEach((deleteButton, index) => {
    deleteButton.addEventListener('click', () => {
      spendOn.set(convertDate(spendList[index].date), spendOn.get(convertDate(spendList[index].date)) - spendList[index].amount);
      spendList.splice(index, 1);

      renderSpendList();

      recomputePS = true;
      rebuildST = true;
      recomputeRM = true;
    });
  });
}

function addSpend() {
  const nameInputElement = document.querySelector('.js-name-input');
  const name = nameInputElement.value;

  const amountInputElement = document.querySelector('.js-amount-input');
  const amount = Number(amountInputElement.value);

  const dateInputElement = document.querySelector('.js-date-input');
  const date = dateInputElement.value;

  spendList.push({
    name,
    amount,
    date
  });

  spendOn.set(convertDate(date), (spendOn.get(convertDate(date)) || 0) + amount);

  renderSpendList();

  recomputePS = true;
  rebuildST = true;
  recomputeRM = true;

  nameInputElement.value = '';
  amountInputElement.value = '';
  dateInputElement.value = '';
}

