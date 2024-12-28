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

document.querySelector('.js-file-input').addEventListener('change', (event) => {
  const file = event.target.files[0];
  
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target.result;
      const lines = contents.split('\n');

      lines.forEach((line, index) => {
        const spend = line.split(', ');

        if (spend.length !== 3) {
          return;
        }

        const name = spend[0];
        const amount = Number(spend[1]);
        const date = spend[2];

        spendList.push({
          name,
          amount,
          date
        });
      });

      renderSpendList();
    }

    reader.readAsText(file);
  }
});

document.querySelector('.js-file-write-button').addEventListener('click', () => {
  let data = '';
  spendList.forEach((spendObject, index) => {
    const { name, amount, date } = spendObject;
    data += `${name}, ${amount}, ${date}\n`;
  });

  const blob = new Blob([data], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'spend-list.txt';
  link.click();
});

const spendList = [];

const N = 1e4;
const PS = new Array(N).fill(0);
const ST = new Array(N * 4);
const RM = new Array(N).fill(null).map(() => new Array(Math.ceil(Math.log2(N))).fill(0));
let recomputePS = true;
let rebuildST = true;
let recomputeRM = true;
let resort = true;

function search() {
  const startDateInputElement = document.querySelector('.js-start-date-input');
  const startDate = startDateInputElement.value;
  if (startDate === '') {
    alert('Please enter start date');
    return;
  }

  const endDateInputElement = document.querySelector('.js-end-date-input');
  const endDate = endDateInputElement.value;
  if (startDate === '') {
    alert('Please enter start date');
    return;
  }

  const queryTypeContainer = document.querySelector('.js-query-type-container').querySelector('select');
  const queryType = queryTypeContainer.value;
  if (queryType === '0') {
    alert('Please select a query type');
    return;
  }

  const resultElement = document.querySelector('.js-result-grid');

  if (resort) {
    spendList.sort((a, b) => {
      return a.date < b.date;
    });
    renderSpendList();
    resort = false;
  }

  if (queryType === '1') {
    resultElement.innerHTML = Intl.NumberFormat('en-US').format(totalSpend(startDate, endDate)) + ' VND';
  }
  else if (queryType === '2') {
    const index = getMin(startDate, endDate);
    if (index === -1) {
      resultElement.innerHTML = 'No spend found';
      return;
    }
    resultElement.innerHTML = `
      <div>Name</div>
      <div>Amount</div>
      <div>Date</div>
      <div>${spendList[index].name}</div>
      <div>${Intl.NumberFormat('en-US').format(spendList[index].amount)} VND</div>
      <div>${spendList[index].date}</div>
    `;
  }
  else if (queryType === '3') {
    const index = getMax(startDate, endDate);
    if (index === -1) {
      resultElement.innerHTML = 'No spend found';
      return;
    }
    resultElement.innerHTML = `
      <div>Name</div>
      <div>Amount</div>
      <div>Date</div>
      <div>${spendList[index].name}</div>
      <div>${Intl.NumberFormat('en-US').format(spendList[index].amount)} VND</div>
      <div>${spendList[index].date}</div>
    `;
  }
}

function computeRM(n) {
  for (let i = 0; i < n; i++) {
    RM[i][0] = i;
  }
  for (let j = 1; j <= Math.floor(Math.log2(n)); j++) {
    for (let i = 0; i + (1 << j) - 1 < n; i++) {
      if (spendList[RM[i][j - 1]].amount > spendList[RM[i + (1 << (j - 1))][j - 1]].amount) {
        RM[i][j] = RM[i][j - 1];
      }
      else {
        RM[i][j] = RM[i + (1 << (j - 1))][j - 1];
      }
    }
  }
}

function getMax(startDate, endDate) {
  const n = spendList.length;
  if (n === 0) {
    return -1;
  }
  if (recomputeRM) {
    computeRM(n);
    recomputeRM = false;
  }
  const end = findStartIndex(startDate);
  const start = findEndIndex(endDate);
  const k = Math.floor(Math.log2(end - start + 1));
  if (spendList[RM[start][k]].amount > spendList[RM[end - (1 << k) + 1][k]].amount) {
    return RM[start][k];
  }
  else {
    return RM[end - (1 << k) + 1][k];
  }
}

function buildSegmentTree(id, start, end) {
  if (start === end) {
    ST[id] = start;
    return;
  }
  const mid = Math.floor((start + end) / 2);
  buildSegmentTree(id * 2, start, mid);
  buildSegmentTree(id * 2 + 1, mid + 1, end);

  if (spendList[ST[id * 2] - 1].amount < spendList[ST[id * 2 + 1] - 1].amount) {
    ST[id] = ST[id * 2];
  }
  else {
    ST[id] = ST[id * 2 + 1];
  }
}

function get(id, start, end, i, j) {
  if (j < start || i > end) {
    return 0;
  }
  if (i <= start && end <= j) {
    return ST[id];
  }
  const mid = Math.floor((start + end) / 2);
  if (get(id * 2, start, mid, i, j) === 0) {
    return get(id * 2 + 1, mid + 1, end, i, j);
  }
  else if (get(id * 2 + 1, mid + 1, end, i, j) === 0) {
    return get(id * 2, start, mid, i, j);
  }
  else {
    if (spendList[get(id * 2, start, mid, i, j) - 1].amount < spendList[get(id * 2 + 1, mid + 1, end, i, j) - 1].amount) {
      return get(id * 2, start, mid, i, j);
    }
    else {
      return get(id * 2 + 1, mid + 1, end, i, j);
    }
  }
}

function getMin(startDate, endDate) {
  const n = spendList.length;
  if (n === 0) {
    return -1;
  }
  if (rebuildST) {
    buildSegmentTree(1, 1, n);
    rebuildST = false;
  }
  const end = findStartIndex(startDate) + 1;
  const start = findEndIndex(endDate) + 1;
  return get(1, 1, n, start, end) - 1;
}

function computePS(n) {
  PS.fill(0);
  for (let i = 0; i < n; i++) {
    PS[i + 1] += PS[i] + spendList[i].amount;
  }
}

function findStartIndex(date) {
  let start = 0;
  let end = spendList.length - 1;
  while (start < end) {
    const mid = Math.floor((start + end) / 2);
    if (spendList[mid].date < date) {
      end = mid;
    }
    else {
      start = mid + 1;
    }
  }

  if (start === end && spendList[start].date < date) {
    return start - 1;
  }
  else {
    return spendList.length - 1;
  }
}

function findEndIndex(date) {
  let start = 0;
  let end = spendList.length - 1;
  while (start < end) {
    const mid = Math.floor((start + end) / 2);
    if (spendList[mid].date <= date) {
      end = mid;
    }
    else {
      start = mid + 1;
    }
  }

  if (start === end && spendList[start].date <= date) {
    return start;
  }
  else {
    return 0;
  }
}

function totalSpend(startDate, endDate) {
  const n = spendList.length;
  if (n === 0) {
    return 0;
  }
  if (recomputePS) {
    computePS(n);
    recomputePS = false;
  }
  const end = findStartIndex(startDate);
  const start = findEndIndex(endDate);
  return PS[end + 1] - PS[start];
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
      spendList.splice(index, 1);

      renderSpendList();

      recomputePS = true;
      rebuildST = true;
      recomputeRM = true;
      resort = true;
    });
  });
}

function addSpend() {
  const nameInputElement = document.querySelector('.js-name-input');
  const name = nameInputElement.value;
  if (name === '') {
    alert('Please enter spend name');
    return;
  }

  const amountInputElement = document.querySelector('.js-amount-input');
  const amount = Number(amountInputElement.value);
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  const dateInputElement = document.querySelector('.js-date-input');
  const date = dateInputElement.value;
  if(date === '') {
    alert('Please enter spend date');
    return;
  }

  spendList.push({
    name,
    amount,
    date
  });

  renderSpendList();

  recomputePS = true;
  rebuildST = true;
  recomputeRM = true;
  resort = true;

  nameInputElement.value = '';
  amountInputElement.value = '';
  dateInputElement.value = '';
}
