import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- 1. FIREBASE KONFİQURASİYASI ---
const firebaseConfig = {
    apiKey: "AIzaSyB7_5BklYQlxBZBWCBVjqE8Dcvh8hwtsKY",
    authDomain: "xercler-89fbd.firebaseapp.com",
    databaseURL: "https://xercler-89fbd-default-rtdb.firebaseio.com",
    projectId: "xercler-89fbd",
    storageBucket: "xercler-89fbd.firebasestorage.app",
    messagingSenderId: "789209022991",
    appId: "1:789209022991:web:b0180af002495bbd01597a",
    measurementId: "G-1TTBTRL2EH"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Global dəyişənlər
let currentUser = localStorage.getItem("currentUser") || null;
let currentMonth = new Date().toISOString().slice(0, 7); // Məs: "2026-06"
let monthlyBudget = 0;
let expenses = [];
let incomes = [];
let categoryChart = null;
let mediaStream = null;

let currentListeners = [];

// DOM Elementləri
const authContainer = document.getElementById("authContainer");
const mainAppContainer = document.getElementById("mainAppContainer");
const authNicknameInput = document.getElementById("authNickname");
const authPasswordInput = document.getElementById("authPassword");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");
const userGreeting = document.getElementById("userGreeting");
const monthSelector = document.getElementById("monthSelector");

const monthlyBudgetInput = document.getElementById("monthlyBudget");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const deleteBudgetBtn = document.getElementById("deleteBudgetBtn");

const displayBudget = document.getElementById("displayBudget");
const displayTotalIncome = document.getElementById("displayTotalIncome");
const displayTotalExpense = document.getElementById("displayTotalExpense");
const displayBalance = document.getElementById("displayBalance");

const expenseForm = document.getElementById("expenseForm");
const incomeForm = document.getElementById("incomeForm");
const expenseTableBody = document.getElementById("expenseTableBody");
const incomeTableBody = document.getElementById("incomeTableBody");

const analyzeFinanceBtn = document.getElementById("analyzeFinanceBtn");
const aiFinancialAdvice = document.getElementById("aiFinancialAdvice");

const receiptImageInput = document.getElementById("receiptImage");
const openCameraBtn = document.getElementById("openCameraBtn");
const scanReceiptBtn = document.getElementById("scanReceiptBtn");
const cameraContainer = document.getElementById("cameraContainer");
const webcam = document.getElementById("webcam");
const captureBtn = document.getElementById("captureBtn");
const closeCameraBtn = document.getElementById("closeCameraBtn");
const canvas = document.getElementById("canvas");
const aiStatus = document.getElementById("aiStatus");

const today = new Date().toISOString().split('T')[0];
if(document.getElementById("itemDate")) document.getElementById("itemDate").value = today;
if(document.getElementById("incomeDate")) document.getElementById("incomeDate").value = today;

// --- 2. GİRİŞ VƏ QEYDİYYAT ---
registerBtn.addEventListener("click", async () => {
    const nickname = authNicknameInput.value.trim().toLowerCase();
    const password = authPasswordInput.value.trim();
    if (!nickname || !password) return showAuthStatus("❌ Nickname və parol yazın!");

    const snapshot = await get(ref(db, `users/${nickname}`));
    if (snapshot.exists()) {
        showAuthStatus("❌ Bu nickname artıq götürülüb!");
    } else {
        await set(ref(db, `users/${nickname}/profile`), { password });
        showAuthStatus("✅ Uğurla qeydiyyatdan keçdiniz!", true);
    }
});

loginBtn.addEventListener("click", async () => {
    const nickname = authNicknameInput.value.trim().toLowerCase();
    const password = authPasswordInput.value.trim();
    if (!nickname || !password) return showAuthStatus("❌ Nickname və parol yazın!");

    const snapshot = await get(ref(db, `users/${nickname}/profile`));
    if (snapshot.exists() && snapshot.val().password === password) {
        currentUser = nickname;
        localStorage.setItem("currentUser", currentUser);
        initApp();
    } else {
        showAuthStatus("❌ Ləqəb və ya parol yanlışdır!");
    }
});

logoutBtn.addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("currentUser");
    location.reload();
});

function showAuthStatus(msg, isSuccess = false) {
    authStatus.innerText = msg;
    authStatus.style.color = isSuccess ? "var(--success)" : "var(--danger)";
}

if (currentUser) initApp();

function initApp() {
    authContainer.style.display = "none";
    mainAppContainer.style.display = "block";
    userGreeting.innerText = `👤 ${currentUser}`;
    loadAvailableMonths();
}

// --- 3. AYILARIN İDARƏSİ VƏ ARXİVİ ---
async function loadAvailableMonths() {
    const monthsRef = ref(db, `users/${currentUser}/months`);
    const snapshot = await get(monthsRef);
    
    let monthsSet = new Set();
    monthsSet.add(currentMonth); // Cari ayı mütləq əlavə edirik

    if (snapshot.exists()) {
        Object.keys(snapshot.val()).forEach(m => monthsSet.add(m));
    }

    // Seçim menyusunu yeniləyirik
    monthSelector.innerHTML = "";
    Array.from(monthsSet).sort().reverse().forEach(m => {
        const option = document.createElement("option");
        option.value = m;
        option.innerText = `📅 Ay: ${m}`;
        if (m === currentMonth) option.selected = true;
        monthSelector.appendChild(option);
    });

    loadDataForMonth(currentMonth);
}

monthSelector.addEventListener("change", (e) => {
    currentMonth = e.target.value;
    loadDataForMonth(currentMonth);
});

// --- 4. SEÇİLƏN AY ÜZRƏ VERİLƏNLƏRİN YÜKLƏNMƏSİ ---
function loadDataForMonth(monthKey) {
    monthlyBudget = 0;
    expenses = [];
    incomes = [];

    const monthRef = ref(db, `users/${currentUser}/months/${monthKey}`);

    onValue(ref(db, `users/${currentUser}/months/${monthKey}/budget`), (snapshot) => {
        monthlyBudget = snapshot.val() || 0;
        displayBudget.innerText = `${monthlyBudget.toFixed(2)} ₼`;
        
        if (monthlyBudget > 0) {
            monthlyBudgetInput.value = monthlyBudget;
            monthlyBudgetInput.disabled = true;
            saveBudgetBtn.style.display = "none";
            deleteBudgetBtn.style.display = "inline-block";
        } else {
            monthlyBudgetInput.value = "";
            monthlyBudgetInput.disabled = false;
            saveBudgetBtn.style.display = "inline-block";
            deleteBudgetBtn.style.display = "none";
        }
        calculateTotals();
    }, { onlyOnce: true });

    // Xərclər
    onValue(ref(db, `users/${currentUser}/months/${monthKey}/expenses`), (snapshot) => {
        const data = snapshot.val();
        expenses = [];
        expenseTableBody.innerHTML = "";
        if (data) {
            Object.keys(data).forEach(key => {
                const item = { id: key, ...data[key] };
                expenses.push(item);
                expenseTableBody.innerHTML += `
                    <tr>
                        <td>${item.date}</td>
                        <td>${item.name}</td>
                        <td>${item.category}</td>
                        <td>${parseFloat(item.price).toFixed(2)} ₼</td>
                        <td><button class="btn btn-danger btn-sm" onclick="deleteItem('expenses', '${key}')">Sil</button></td>
                    </tr>`;
            });
        }
        calculateTotals();
        updateChart();
    });

    // Gəlirlər
    onValue(ref(db, `users/${currentUser}/months/${monthKey}/incomes`), (snapshot) => {
        const data = snapshot.val();
        incomes = [];
        incomeTableBody.innerHTML = "";
        if (data) {
            Object.keys(data).forEach(key => {
                const item = { id: key, ...data[key] };
                incomes.push(item);
                incomeTableBody.innerHTML += `
                    <tr>
                        <td>${item.date}</td>
                        <td>${item.name}</td>
                        <td>${parseFloat(item.price).toFixed(2)} ₼</td>
                        <td><button class="btn btn-danger btn-sm" onclick="deleteItem('incomes', '${key}')">Sil</button></td>
                    </tr>`;
            });
        }
        calculateTotals();
    });
}

// Büdcəni cari aya yazmaq
saveBudgetBtn.addEventListener("click", () => {
    const val = parseFloat(monthlyBudgetInput.value);
    if (!isNaN(val) && val >= 0) {
        set(ref(db, `users/${currentUser}/months/${currentMonth}/budget`), val);
    }
});

deleteBudgetBtn.addEventListener("click", () => {
    remove(ref(db, `users/${currentUser}/months/${currentMonth}/budget`));
});

// Gəlir Əlavə Et (Seçilən aya yazılır)
incomeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const dateVal = document.getElementById("incomeDate").value;
    const targetMonth = dateVal.slice(0, 7);

    const newIncome = {
        name: document.getElementById("incomeName").value.trim(),
        price: parseFloat(document.getElementById("incomePrice").value),
        date: dateVal
    };

    push(ref(db, `users/${currentUser}/months/${targetMonth}/incomes`), newIncome).then(() => {
        incomeForm.reset();
        document.getElementById("incomeDate").value = today;
        loadAvailableMonths();
    });
});

// Xərc Əlavə Et (Seçilən aya yazılır)
expenseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const dateVal = document.getElementById("itemDate").value;
    const targetMonth = dateVal.slice(0, 7);

    const newExpense = {
        name: document.getElementById("itemName").value.trim(),
        price: parseFloat(document.getElementById("itemPrice").value),
        category: document.getElementById("itemCategory").value,
        date: dateVal
    };

    push(ref(db, `users/${currentUser}/months/${targetMonth}/expenses`), newExpense).then(() => {
        expenseForm.reset();
        document.getElementById("itemDate").value = today;
        loadAvailableMonths();
    });
});

window.deleteItem = function(type, id) {
    remove(ref(db, `users/${currentUser}/months/${currentMonth}/${type}/${id}`));
};

function calculateTotals() {
    const totalIncome = incomes.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const netBalance = (monthlyBudget + totalIncome) - totalExpense;

    displayTotalIncome.innerText = `${totalIncome.toFixed(2)} ₼`;
    displayTotalExpense.innerText = `${totalExpense.toFixed(2)} ₼`;
    displayBalance.innerText = `${netBalance.toFixed(2)} ₼`;
    displayBalance.style.color = netBalance < 0 ? "var(--danger)" : "var(--info)";
}

// --- 5. KAMERA VƏ AI ÇEK SKANNERİ ---
openCameraBtn.addEventListener("click", async () => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        webcam.srcObject = mediaStream;
        cameraContainer.style.display = "block";
    } catch (err) {
        alert("Kameraya icazə verilmədi!");
    }
});

closeCameraBtn.addEventListener("click", stopCamera);

function stopCamera() {
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    cameraContainer.style.display = "none";
}

captureBtn.addEventListener("click", () => {
    const ctx = canvas.getContext("2d");
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    ctx.drawImage(webcam, 0, 0);

    canvas.toBlob((blob) => {
        const file = new File([blob], "receipt_capture.jpg", { type: "image/jpeg" });
        const container = new DataTransfer();
        container.items.add(file);
        receiptImageInput.files = container.files;
        stopCamera();
        aiStatus.innerText = "📸 Şəkil çəkildi! 'Çeki AI ilə Oxu' düyməsini sıxın.";
        aiStatus.style.color = "var(--success)";
    }, "image/jpeg");
});

scanReceiptBtn.addEventListener("click", async () => {
    const file = receiptImageInput.files[0];
    if (!file) {
        aiStatus.innerText = "❌ Lütfən çek şəkli seçin!";
        aiStatus.style.color = "var(--danger)";
        return;
    }

    aiStatus.innerText = "⏳ Çek oxunur...";
    aiStatus.style.color = "var(--info)";

    try {
        const keySnap = await get(ref(db, "gemini_key"));
        if (!keySnap.exists()) throw new Error("Firebase-də 'gemini_key' tapılmadı.");
        const apiKey = keySnap.val().trim();

        const base64Data = await fileToBase64(file);
        const prompt = `Bu çek görüntüsünü analiz et. Ümumi məbləği (price), mağaza adını (name) və kateqoriyanı (Market, Kommunal, Nəqliyyat/Yanacaq, Əyləncə/Restoran, Geyim, Digər) tap. YALNIZ pure JSON cavabı qaytar: {"name": "Mağaza", "price": 12.50, "category": "Market"}`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type || "image/jpeg", data: base64Data } }] }] })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        let resultText = data.candidates[0].content.parts[0].text.trim().replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(resultText);

        if (parsed.price) {
            const expenseDate = today;
            const targetMonth = expenseDate.slice(0, 7);

            await push(ref(db, `users/${currentUser}/months/${targetMonth}/expenses`), {
                name: parsed.name || "Çek xərci",
                price: parseFloat(parsed.price),
                category: parsed.category || "Market",
                date: expenseDate
            });

            aiStatus.innerText = `✅ Çək əlavə edildi: ${parsed.price} AZN`;
            aiStatus.style.color = "var(--success)";
            receiptImageInput.value = "";
            loadAvailableMonths();
        } else {
            throw new Error("Qiymət tapılmadı.");
        }
    } catch (err) {
        aiStatus.innerText = "❌ Xəta: " + err.message;
        aiStatus.style.color = "var(--danger)";
    }
});

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- 6. TAB KEÇİDLƏRİ ---
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    });
});

// --- 7. AI MALİYYƏ AUDİTİ ---
analyzeFinanceBtn.addEventListener("click", async () => {
    aiFinancialAdvice.innerText = "⏳ AI maliyyə balansınızı təhlil edir...";

    try {
        const keySnap = await get(ref(db, "gemini_key"));
        if (!keySnap.exists()) throw new Error("API Key tapılmadı.");
        const apiKey = keySnap.val().trim();

        const totalInc = incomes.reduce((sum, i) => sum + parseFloat(i.price), 0);
        const totalExp = expenses.reduce((sum, e) => sum + parseFloat(e.price), 0);

        const prompt = `Ay üzrə maliyyə auditi (${currentMonth}):
- Büdcə: ${monthlyBudget} AZN
- Əlavə Gəlirlər: ${totalInc} AZN
- Ümumi Xərc: ${totalExp} AZN
- Xərclər: ${JSON.stringify(expenses)}
Qısa, dəqiq və motivasiyaedici maliyyə məsləhəti ver (Azərbaycan dilində).`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            aiFinancialAdvice.innerHTML = data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>');
        } else {
            throw new Error("Cavab alınmadı.");
        }
    } catch (err) {
        aiFinancialAdvice.innerText = "❌ Xəta: " + err.message;
    }
});

// --- 8. QRAFİK ---
function updateChart() {
    const categories = {};
    expenses.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + parseFloat(item.price);
    });

    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#ee5d50', '#4318ff', '#01b574', '#ffb547', '#8688ef', '#2b3674']
            }]
        },
        options: { responsive: true }
    });
}
