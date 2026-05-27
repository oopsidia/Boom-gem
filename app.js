// 👑 [시간 동기화 + 가로 슬라이더] 교차 연동 최적화 버전 (app.js)

// 온보딩이 필수가 아니므로 기본값을 '미지정' 및 슬라이더 디폴트로 선언
let userProfile = { 
    gender: '미지정', 
    age: '20대 후반', 
    purpose: '미지정', 
    companion: '미지정', 
    transport: '미지정', 
    tolerance: '미지정' 
};

const onboardingScreen = document.getElementById('onboarding-screen');
const mainScreen = document.getElementById('main-screen');
const startBtn = document.getElementById('start-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const resetProfileBtn = document.getElementById('reset-profile-btn');

// 1️⃣ 온보딩 시스템 (버튼 선택형 + 가로 슬라이더 가이드 포함)
function setupOnboarding() {
    // 가로 바 나이 슬라이더 제어 로직
    const ageSlider = document.getElementById('age-slider');
    const ageVal = document.getElementById('age-val');
    const ageLabels = ["", "10대", "20대 초반", "20대 후반", "30대", "40대", "50대", "60대 이상"];

    if (ageSlider && ageVal) {
        ageSlider.addEventListener('input', (e) => {
            const index = parseInt(e.target.value);
            const selectedAge = ageLabels[index] || "미지정";
            ageVal.innerText = selectedAge;
            userProfile.age = selectedAge;
        });
    }

    // 나머지 성별, 목적, 동행자, 교통 등 버튼식 그룹 제어
    const groups = ['gender-group', 'purpose-group', 'companion-group', 'transport-group', 'tolerance-group'];
    
    groups.forEach(groupId => {
        const group = document.getElementById(groupId);
        if (!group) return;
        const buttons = group.querySelectorAll('.onboard-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => {
                    b.classList.remove('bg-emerald-500/20', 'border-emerald-500', 'text-emerald-400');
                    b.classList.add('bg-slate-800', 'border-slate-700', 'text-slate-100');
                });
                btn.classList.remove('bg-slate-800', 'border-slate-700', 'text-slate-100');
                btn.classList.add('bg-emerald-500/20', 'border-emerald-500', 'text-emerald-400');
                
                const key = groupId.split('-')[0];
                if (userProfile.hasOwnProperty(key)) {
                    userProfile[key] = btn.getAttribute('data-value') || '미지정';
                }
            });
        });
    });
}

// 화면 전환 이벤트 리스너
if (startBtn) {
    startBtn.addEventListener('click', () => {
        onboardingScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
    });
}

if (resetProfileBtn) {
    resetProfileBtn.addEventListener('click', () => {
        mainScreen.classList.add('hidden');
        onboardingScreen.classList.remove('hidden');
    });
}

// 2️⃣ 자연어 장소 감지 엔진 (places.js 연계)
function detectPlace(inputText) {
    if (typeof SEOUL_PLACES === 'undefined') return null;
    const cleanText = inputText.replace(/\s+/g, '');
    for (const place of SEOUL_PLACES) {
        for (const keyword of place.keywords) {
            if (cleanText.includes(keyword)) {
                return place;
            }
        }
    }
    return null;
}

// 3️⃣ LocalStorage 집단지성 피드백 데이터 저장/추출
function saveFeedback(placeCode, feedbackText) {
    let allFeedbacks = JSON.parse(localStorage.getItem('boom_feedbacks')) || [];
    allFeedbacks.push({
        code: placeCode,
        feedback: feedbackText,
        timestamp: new Date().getTime()
    });
    localStorage.setItem('boom_feedbacks', JSON.stringify(allFeedbacks));
}

function getFeedbackHistory(placeCode) {
    if (!placeCode) return [];
    let allFeedbacks = JSON.parse(localStorage.getItem('boom_feedbacks')) || [];
    return allFeedbacks.filter(item => item.code === placeCode);
}

// 4️⃣ UI 메시지 렌더링 및 동적 스크롤 제어
function appendMessage(sender, text, isSimulated = false, detectedBadge = null, placeCode = null) {
    if (!chatMessages) return;
    const messageWrapper = document.createElement('div');
    messageWrapper.className = sender === 'user' ? 'flex flex-col items-end gap-1' : 'flex gap-3 max-w-[85%]';
    
    if (sender === 'user') {
        messageWrapper.innerHTML = `
            <div class="bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm max-w-[100%] break-all">
                ${text}
            </div>
            ${detectedBadge ? `<span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700/50 font-mono mt-1">📍 시스템 감지: ${detectedBadge}</span>` : ''}
        `;
        chatMessages.appendChild(messageWrapper);
    } else {
        messageWrapper.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-xs shrink-0 shadow">🤖</div>
            <div class="space-y-2 flex-1">
                <div class="chat-text bg-slate-800 border border-slate-700/60 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm leading-relaxed shadow-sm whitespace-pre-line"></div>
                <div class="feedback-area flex gap-2 hidden"></div>
            </div>
        `;
        chatMessages.appendChild(messageWrapper);
        
        const textContainer = messageWrapper.querySelector('.chat-text');
        const feedbackArea = messageWrapper.querySelector('.feedback-area');
        
        if (isSimulated) {
            typeMessage(textContainer, text, () => {
                if (placeCode && feedbackArea) renderFeedbackButtons(feedbackArea, placeCode);
            });
        } else {
            if (textContainer) textContainer.innerText = text;
            if (placeCode && feedbackArea) renderFeedbackButtons(feedbackArea, placeCode);
        }
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function typeMessage(element, text, callback = null) {
    if (!element) return;
    element.classList.add('typing');
    let index = 0;
    function play() {
        if (index < text.length) {
            element.innerText += text[index];
            index++;
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
            setTimeout(play, 12);
        } else {
            element.classList.remove('typing');
            if (callback) callback();
        }
    }
    play();
}

function renderFeedbackButtons(container, placeCode) {
    if (!container) return;
    container.classList.remove('hidden');
    container.innerHTML = `
        <button class="f-btn px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-rose-400 hover:border-rose-500 active:scale-95 transition-all" data-fb="생각보다 더 혼잡했음 🥵">생각보다 더 혼잡했어 🥵</button>
        <button class="f-btn px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-cyan-400 hover:border-cyan-500 active:scale-95 transition-all" data-fb="생각보다 여유로웠음 😎">생각보다 한산했어 😎</button>
    `;
    
    const buttons = container.querySelectorAll('.f-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const feedbackText = btn.getAttribute('data-fb');
            saveFeedback(placeCode, feedbackText);
            container.innerHTML = `<span class="text-[10px] text-slate-500 font-medium px-1">✓ 실시간 체감 보고가 전송되었습니다.</span>`;
        });
    });
}

// 5️⃣ 실시간 서버 데이터 전송 및 유저 로컬 시간 주입
async function handleSend() {
    if (!chatInput || !chatMessages) return;
    const text = chatInput.value.trim();
    if (!text) return;
    
    const foundPlace = detectPlace(text);
    let badgeText = null;
    let placeCode = null;
    if (foundPlace) {
        badgeText = `${foundPlace.name} (${foundPlace.code})`;
        placeCode = foundPlace.code;
    }
    
    appendMessage('user', text, false, badgeText);
    chatInput.value = '';
    
    const historyData = getFeedbackHistory(placeCode);
    
    // ⏰ 유저가 질문을 던진 현재 실제 PC 시각 정보 추출
    const now = new Date();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const currentTimeInfo = {
        date: now.toLocaleDateString('ko-KR'),
        dayOfWeek: days[now.getDay()],
        time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
    
    appendMessage('bot', "실시간 데이터 가동 및 시간 동기화 필터 가동 중... 💥", false);
    const allBotMessages = chatMessages.querySelectorAll('.chat-text');
    const loadingElement = allBotMessages[allBotMessages.length - 1];
    if (loadingElement) loadingElement.classList.add('typing');

    try {
        // 🚀 본인의 실제 클라우드플레어 주소로 연동 확인 요망
        const WORKER_URL = "https://boom-gem.sh031300.workers.dev"; 
        
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                place: foundPlace,
                userProfile: userProfile,
                history: historyData,
                currentTime: currentTimeInfo // ⏰ 실시간 시각 동시 주입
            })
        });

        const data = await response.json();
        if (loadingElement) loadingElement.classList.remove('typing');

        if (data.error) {
            if (loadingElement) loadingElement.innerHTML = `<span class="text-rose-400 font-semibold">❌ 에러:</span> ${data.error}`;
            return;
        }
        
        if (loadingElement) {
            loadingElement.innerText = "";
            appendMessage('bot', data.reply, true, null, placeCode); 
            loadingElement.closest('.flex').remove();
        }

    } catch (error) {
        if (loadingElement) {
            loadingElement.classList.remove('typing');
            loadingElement.innerText = "서버 통신에 실패했어. 주소나 배포 상태를 검토해봐!";
        }
    }
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
setupOnboarding();
