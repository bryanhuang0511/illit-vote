// ==========================================================================
// 🚀 ILLIT 投票網站前端邏輯與互動管理 (Serverless 雲端同步版)
// ==========================================================================

// 免費雲端 Redis 鍵值資料庫 URL (使用隨機的專屬 Bucket ID)
const KV_URL = 'https://jsonblob.com/api/jsonBlob/019e9682-534a-7b1a-b82d-73d1a189fd04';

// 寫死的 10 張圖片清單 (因為是純前端託管)
const ILLIT_IMAGES = [
  "ILLIT_Forest_Group.jpg",
  "ILLIT_Stage_Back.jpg",
  "ILLIT_Logo.jpg",
  "ILLIT_Stage_Performance.jpg",
  "ILLIT_Studio_Group.jpg",
  "ILLIT_Cake_Celebration.jpg",
  "ILLIT_Veil_Window.jpg",
  "ILLIT_Blue_Plaid_Selfie.jpg",
  "ILLIT_Sunset_Cart.jpg",
  "ILLIT_Bedroom_Group.jpg"
];

// 狀態管理
const state = {
  voterName: localStorage.getItem('voterName') || '',
  selectedImages: [],
  images: ILLIT_IMAGES,
  hasVoted: localStorage.getItem('hasVoted') === 'true',
  refreshInterval: null
};

// DOM 元素
const stepName = document.getElementById('step-name');
const stepVote = document.getElementById('step-vote');
const stepResults = document.getElementById('step-results');

const nameInput = document.getElementById('voter-name-input');
const btnStartVote = document.getElementById('btn-start-vote');
const btnSkipToResults = document.getElementById('btn-skip-to-results');
const displayUserName = document.getElementById('display-user-name');
const selectedCount = document.getElementById('selected-count');
const submitBarCount = document.getElementById('submit-bar-count');
const btnSubmitVote = document.getElementById('btn-submit-vote');
const btnGoBackVote = document.getElementById('btn-go-back-vote');
const totalVotersCount = document.getElementById('total-voters-count');
const imageGrid = document.getElementById('image-grid');
const resultsList = document.getElementById('results-list');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// --- 初始載入 ---
document.addEventListener('DOMContentLoaded', () => {
  // 自動填入先前輸入的名字
  if (state.voterName) {
    nameInput.value = state.voterName;
  }

  // 渲染圖片列表
  renderImageGrid();

  // 註冊事件監聽
  btnStartVote.addEventListener('click', startVotingFlow);
  btnSkipToResults.addEventListener('click', skipToResultsFlow);
  btnSubmitVote.addEventListener('click', submitVote);
  btnGoBackVote.addEventListener('click', goBackToVoteFlow);
  
  // 輸入框 Enter 鍵快捷送出
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      startVotingFlow();
    }
  });

  // 如果已經投過票了，就直接跳轉到結果頁面
  if (state.hasVoted) {
    skipToResultsFlow();
    btnGoBackVote.classList.add('hidden'); // 投過票就不需要回投票頁了
  }
});

// --- 渲染圖片 Grid ---
function renderImageGrid() {
  imageGrid.innerHTML = '';
  
  state.images.forEach((img, index) => {
    const card = document.createElement('div');
    card.className = 'image-card fade-in';
    card.dataset.img = img;
    card.style.animationDelay = `${index * 0.05}s`;

    // 格式化顯示的圖片標題（移除副檔名，把底線換成空格）
    const displayTitle = img.split('.')[0].replace(/_/g, ' ');

    card.innerHTML = `
      <div class="image-wrapper">
        <img src="images/${img}" alt="${displayTitle}" loading="lazy">
      </div>
      <div class="card-overlay">
        <span class="img-title">${displayTitle}</span>
        <div class="badge-check">
          <i class="fa-solid fa-check"></i>
        </div>
      </div>
    `;

    // 點擊卡片選擇
    card.addEventListener('click', () => toggleSelectImage(card, img));
    imageGrid.appendChild(card);
  });
}

// --- 選擇圖片互動 ---
function toggleSelectImage(card, img) {
  if (card.classList.contains('disabled') && !card.classList.contains('selected')) {
    showToast('⚠️ 每人最多只能選擇 3 張圖片喔！');
    return;
  }

  const index = state.selectedImages.indexOf(img);
  if (index > -1) {
    // 取消選擇
    state.selectedImages.splice(index, 1);
    card.classList.remove('selected');
  } else {
    // 新增選擇
    if (state.selectedImages.length < 3) {
      state.selectedImages.push(img);
      card.classList.add('selected');
    }
  }

  // 更新計數器與狀態
  updateVoteCounter();
}

// --- 更新投票計數與卡片狀態 ---
function updateVoteCounter() {
  const count = state.selectedImages.length;
  
  // 更新介面數字
  selectedCount.textContent = count;
  submitBarCount.textContent = count;
  
  // 控制提交按鈕是否可用 (必須選 1~3 張)
  if (count >= 1 && count <= 3) {
    btnSubmitVote.removeAttribute('disabled');
  } else {
    btnSubmitVote.setAttribute('disabled', 'true');
  }

  // 若選滿 3 張，將其他未選中的卡片置灰 (disabled)
  const cards = document.querySelectorAll('.image-card');
  cards.forEach(card => {
    const imgName = card.dataset.img;
    if (count >= 3 && !state.selectedImages.includes(imgName)) {
      card.classList.add('disabled');
    } else {
      card.classList.remove('disabled');
    }
  });
}

// --- 開始投票流程 (輸入名字後) ---
function startVotingFlow() {
  const inputVal = nameInput.value.trim();
  if (!inputVal) {
    showToast('✍️ 請先輸入你在群組內的名稱！');
    nameInput.focus();
    return;
  }

  state.voterName = inputVal;
  localStorage.setItem('voterName', inputVal);
  displayUserName.textContent = inputVal;

  // 切換畫面
  stepName.classList.add('hidden');
  stepVote.classList.remove('hidden');
  
  // 停止結果輪詢
  stopResultsPolling();
}

// --- 跳轉到結果流程 ---
function skipToResultsFlow() {
  stepName.classList.add('hidden');
  stepVote.classList.add('hidden');
  stepResults.classList.remove('hidden');

  // 若尚未投票，允許回投票頁
  if (!state.hasVoted) {
    btnGoBackVote.classList.remove('hidden');
  } else {
    btnGoBackVote.classList.add('hidden');
  }

  // 載入投票結果並啟動輪詢
  fetchResults();
  startResultsPolling();
}

// --- 回投票流程 ---
function goBackToVoteFlow() {
  stepResults.classList.add('hidden');
  
  // 如果已經輸入過名字，直接回投票頁，否則回名字輸入頁
  if (state.voterName) {
    stepVote.classList.remove('hidden');
  } else {
    stepName.classList.remove('hidden');
  }
  
  stopResultsPolling();
}

// --- 從雲端獲取並初始化投票資料的 Helper ---
async function fetchRawVotesData() {
  try {
    const response = await fetch(KV_URL);
    if (!response.ok) {
      // 如果是 404，說明 key 還沒建立，直接回傳空白結構
      return createDefaultData();
    }
    const data = await response.json();
    
    // 防呆：確保欄位完整
    if (!data.votes) data.votes = {};
    if (!data.voters) data.voters = [];
    
    // 補足可能缺少的圖片
    state.images.forEach(img => {
      if (data.votes[img] === undefined) {
        data.votes[img] = 0;
      }
    });
    
    return data;
  } catch (e) {
    console.log("尚未有投票資料或讀取失敗，使用預設空資料。");
    return createDefaultData();
  }
}

function createDefaultData() {
  const defaultData = { votes: {}, voters: [] };
  state.images.forEach(img => {
    defaultData.votes[img] = 0;
  });
  return defaultData;
}

// --- 提交投票 ---
async function submitVote() {
  if (state.selectedImages.length < 1 || state.selectedImages.length > 3) {
    showToast('⚠️ 請選擇 1 到 3 張圖片再進行提交！');
    return;
  }

  try {
    btnSubmitVote.setAttribute('disabled', 'true');
    btnSubmitVote.querySelector('span').textContent = '傳送中...';

    // 1. 先抓取雲端最新的投票資料 (防覆蓋)
    const data = await fetchRawVotesData();

    // 2. 驗證重複投票
    const cleanName = state.voterName.trim();
    const nameExists = data.voters.some(
      voter => voter.toLowerCase().replace(/\s+/g, '') === cleanName.toLowerCase().replace(/\s+/g, '')
    );

    if (nameExists) {
      throw new Error(`「${cleanName}」已經投過票囉！每人限投一次。`);
    }

    // 3. 累加投票並寫入名單
    state.selectedImages.forEach(img => {
      data.votes[img] = (data.votes[img] || 0) + 1;
    });
    data.voters.push(cleanName);

    // 4. PUT 回雲端資料庫
    const saveResponse = await fetch(KV_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!saveResponse.ok) {
      throw new Error('無法存入雲端資料庫，請稍後再試！');
    }

    // 投票成功
    showToast('🌟 投票成功！感謝你的參與！', 4000);
    state.hasVoted = true;
    localStorage.setItem('hasVoted', 'true');
    
    // 跳轉到結果
    setTimeout(() => {
      stepVote.classList.add('hidden');
      stepResults.classList.remove('hidden');
      btnGoBackVote.classList.add('hidden'); // 投完後不讓它回頭了
      fetchResults();
      startResultsPolling();
    }, 1000);

  } catch (err) {
    showToast(`❌ ${err.message}`);
    btnSubmitVote.removeAttribute('disabled');
    btnSubmitVote.querySelector('span').textContent = '提交我的投票';
  }
}

// --- 取得並更新投票結果 ---
async function fetchResults() {
  try {
    const data = await fetchRawVotesData();
    const totalVoters = data.voters.length;
    totalVotersCount.textContent = totalVoters;

    // 將結果排序（票數由高到低）
    const sortedVotes = Object.entries(data.votes).sort((a, b) => b[1] - a[1]);
    
    renderResultsList(sortedVotes, totalVoters);
  } catch (err) {
    console.error('更新投票結果失敗：', err);
  }
}

// --- 渲染投票結果列表 ---
function renderResultsList(sortedVotes, totalVoters) {
  // 保存現有的進度條寬度以求平滑動畫
  const previousWidths = {};
  document.querySelectorAll('.result-item').forEach(item => {
    const imgName = item.dataset.img;
    const bar = item.querySelector('.progress-bar');
    if (bar) {
      previousWidths[imgName] = bar.style.width;
    }
  });

  resultsList.innerHTML = '';
  
  if (sortedVotes.length === 0) {
    resultsList.innerHTML = '<p class="glass-card">目前尚無投票結果。</p>';
    return;
  }

  // 第一名的票數，用來標示 winner
  const maxVote = sortedVotes[0][1];

  sortedVotes.forEach(([img, votesCount], index) => {
    const percentage = totalVoters > 0 ? Math.round((votesCount / totalVoters) * 100) : 0;
    const isWinner = maxVote > 0 && votesCount === maxVote;
    const displayTitle = img.split('.')[0].replace(/_/g, ' ');

    const item = document.createElement('div');
    item.className = `result-item fade-in ${isWinner ? 'winner' : ''}`;
    item.dataset.img = img;
    item.style.animationDelay = `${index * 0.05}s`;

    item.innerHTML = `
      <div class="result-thumb">
        <img src="images/${img}" alt="${displayTitle}">
      </div>
      <div class="result-info">
        <div class="result-name">${displayTitle}</div>
        <div class="progress-container">
          <div class="progress-track">
            <div class="progress-bar" style="width: 0%"></div>
          </div>
        </div>
      </div>
      <div class="result-stats">
        <div>${percentage}%</div>
        <div class="result-votes">${votesCount} 票</div>
      </div>
    `;

    resultsList.appendChild(item);

    // 平滑延遲設定進度條寬度，觸發 CSS transition
    setTimeout(() => {
      const bar = item.querySelector('.progress-bar');
      if (bar) {
        bar.style.width = `${percentage}%`;
      }
    }, 100);
  });
}

// --- 啟動結果自動更新 ---
function startResultsPolling() {
  if (state.refreshInterval) clearInterval(state.refreshInterval);
  state.refreshInterval = setInterval(fetchResults, 5000);
}

// --- 停止結果自動更新 ---
function stopResultsPolling() {
  if (state.refreshInterval) {
    clearInterval(state.refreshInterval);
    state.refreshInterval = null;
  }
}

// --- Toast 提示功能 ---
let toastTimeout;
function showToast(message, duration = 3000) {
  clearTimeout(toastTimeout);
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}
