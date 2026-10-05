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
let monthlyBudget = 0;
let expenses = [];
let categoryChart = null;

// DOM Elementləri
const monthlyBudgetInput = document.getElementById("monthlyBudget");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const displayBudget = document.getElementById("displayBudget");
const displayTotalExpense = document.getElementById("displayTotalExpense");
const displayBalance = document.getElementById("displayBalance");

const expenseForm = document.getElementById("expenseForm");
const itemNameInput = document.getElementById("itemName");
const itemPriceInput = document.getElementById("itemPrice");
const itemCategoryInput = document.getElementById("itemCategory");
const itemDateInput = document.getElementById("itemDate");
const expenseTableBody = document.getElementById("expenseTableBody");

const receiptImageInput = document.getElementById("receiptImage");
const scanReceiptBtn = document.getElementById("scanReceiptBtn");
const aiStatus = document.getElementById("aiStatus");
const topExpenseNotice = document.getElementById("topExpenseNotice");

// Kamera DOM Elementləri
const openCameraBtn = document.getElementById("openCameraBtn");
const closeCameraBtn = document.getElementById("closeCameraBtn");
const captureBtn = document.getElementById("captureBtn");
const cameraContainer = document.getElementById("cameraContainer");
const webcam = document.getElementById("webcam");
const canvas = document.getElementById("canvas");

let mediaStream = null;

// Bugünün tarixini avtomatik seçmək
if (itemDateInput) {
    itemDateInput.value = new Date().toISOString().split('T')[0];
}

// --- 2. FIREBASE-DƏN VERİLƏNLƏRİN OXUNMASI ---
const budgetRef = ref(db, 'budget');
const expensesRef = ref(db, 'expenses');

onValue(budgetRef, (snapshot) => {
    monthlyBudget = snapshot.val() || 0;
    displayBudget.innerText = `${monthlyBudget.toFixed(2)} ₼`;
    monthlyBudgetInput.value = monthlyBudget > 0 ? monthlyBudget : '';
    calculateTotals();
});

onValue(expensesRef, (snapshot) => {
    const data = snapshot.val();
    expenses = [];
    expenseTableBody.innerHTML = "";

    if (data) {
        Object.keys(data).forEach(key => {
            const item = data[key];
            item.id = key;
            expenses.push(item);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.date}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${parseFloat(item.price).toFixed(2)} ₼</td>
                <td><button class="delete-btn" data-id="${key}">Sil</button></td>
            `;
            expenseTableBody.appendChild(row);
        });

        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                deleteExpense(id);
            });
        });
    }
    calculateTotals();
    updateChart();
});

function deleteExpense(id) {
    remove(ref(db, `expenses/${id}`))
        .then(() => console.log("Məlumat silindi"))
        .catch(err => console.error("Silinmə xətası:", err));
}

// --- 3. BÜDCƏ VƏ XƏRC YAZILMASI ---
saveBudgetBtn.addEventListener("click", () => {
    const val = parseFloat(monthlyBudgetInput.value);
    if (!isNaN(val) && val >= 0) {
        set(budgetRef, val)
            .then(() => alert("Büdcə uğurla saxlanıldı!"))
            .catch(err => console.error("Büdcə saxlanılmadı:", err));
    }
});

expenseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newExpense = {
        name: itemNameInput.value.trim(),
        price: parseFloat(itemPriceInput.value),
        category: itemCategoryInput.value,
        date: itemDateInput.value
    };

    push(expensesRef, newExpense)
        .then(() => {
            itemNameInput.value = "";
            itemPriceInput.value = "";
        })
        .catch(err => console.error("Xərc əlavə olunmadı:", err));
});

function calculateTotals() {
    const totalExpense = expenses.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const balance = monthlyBudget - totalExpense;

    displayTotalExpense.innerText = `${totalExpense.toFixed(2)} ₼`;
    displayBalance.innerText = `${balance.toFixed(2)} ₼`;
    displayBalance.style.color = balance < 0 ? "#e74c3c" : "#2c3e50";
}

// --- 4. KAMERA İLƏ ŞƏKİL ÇƏKMƏ FUNKSİYASI ---
if (openCameraBtn) {
    openCameraBtn.addEventListener("click", async () => {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false
            });
            webcam.srcObject = mediaStream;
            cameraContainer.style.display = "block";
            aiStatus.innerText = "📷 Kamera aktivdir. Çeki kadrda saxlayıb 'Şəkil Çək' düyməsini sıxın.";
            aiStatus.style.color = "#2980b9";
        } catch (err) {
            console.error("Kamera xətası:", err);
            alert("Kameraya daxil olmaq mümkün olmadı. Lütfən brauzerdə kamera icazəsini yoxlayın.");
        }
    });
}

if (closeCameraBtn) {
    closeCameraBtn.addEventListener("click", stopCamera);
}

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (cameraContainer) cameraContainer.style.display = "none";
}

if (captureBtn) {
    captureBtn.addEventListener("click", () => {
        if (!mediaStream) return;

        canvas.width = webcam.videoWidth;
        canvas.height = webcam.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            const capturedFile = new File([blob], "captured_receipt.jpg", { type: "image/jpeg" });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(capturedFile);
            receiptImageInput.files = dataTransfer.files;

            stopCamera();
            aiStatus.innerText = "📸 Şəkil uğurla çəkildi və seçildi! İndi '✨ Çeki AI ilə Oxu' düyməsini sıxın.";
            aiStatus.style.color = "#2ecc71";
        }, "image/jpeg", 0.95);
    });
}

// --- 5. AI İLƏ ÇEK OXUMA (AQ. və AIzaSy Key Dinamik Dəstəyi) ---
scanReceiptBtn.addEventListener("click", async () => {
    const file = receiptImageInput.files[0];
    if (!file) {
        alert("Zəhmət olmasa çəkilmiş şəkil və ya fayl seçin!");
        return;
    }

    aiStatus.innerText = "⏳ AI çekdəki məlumatları təhlil edir...";
    aiStatus.style.color = "#8e44ad";
    scanReceiptBtn.disabled = true;

    try {
        // 1. Firebase-dən API Key-i oxuyuruq
        const keyRef = ref(db, "gemini_key");
        const snapshot = await get(keyRef);
        
        if (!snapshot.exists() || !snapshot.val()) {
            throw new Error("Firebase bazasında 'gemini_key' nodu tapılmadı! Lütfən Firebase Realtime Database-də 'gemini_key' nodunu və dəyərini yaradın.");
        }
        
        const GEMINI_API_KEY = snapshot.val().trim();

        // 2. Şəkli Base64-ə çeviririk
        const base64Image = await convertBase64(file);
        const base64Data = base64Image.split(',')[1];

        const promptText = `Market çekini təhlil et. Məhsul adlarını və qiymətlərini tap.
Mütləq və yalnız təmiz JSON array formatında qaytar (heç bir izahat və ya mətn yazma):
[{"name": "Məhsul adı", "price": 0.00, "category": "Market"}]`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: promptText },
                        {
                            inline_data: {
                                mime_type: file.type || "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }
            ]
        };

        // 3. API Key formatına görə Header və ya URL parametrlərinin dinamik seçilməsi
        let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`;
        const headers = {
            "Content-Type": "application/json"
        };

        if (GEMINI_API_KEY.startsWith("AQ.")) {
            // AQ. ilə başlayan yeni format açarlar üçün header istifadə olunur
            headers["x-goog-api-key"] = GEMINI_API_KEY;
        } else {
            // AIzaSy kimi standart açarlar üçün URL parametridir
            apiUrl += `?key=${GEMINI_API_KEY}`;
        }

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error.message || "API Xətası baş verdi");
        }

        let responseText = result.candidates[0].content.parts[0].text.trim();
        responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const items = JSON.parse(responseText);
        const currentDate = new Date().toISOString().split('T')[0];

        for (const item of items) {
            await push(expensesRef, {
                name: item.name,
                price: parseFloat(item.price) || 0,
                category: item.category || "Market",
                date: currentDate
            });
        }

        aiStatus.innerText = "✅ Çek uğurla oxundu və bazaya yazıldı!";
        aiStatus.style.color = "#2ecc71";
        receiptImageInput.value = "";

    } catch (err) {
        console.error("AI Xətası:", err);
        aiStatus.innerText = "❌ Xəta baş verdi: " + err.message;
        aiStatus.style.color = "#e74c3c";
    } finally {
        scanReceiptBtn.disabled = false;
    }
});

function convertBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

// --- 6. AY SONU QRAFİK VƏ ANALİZ ---
function updateChart() {
    const categories = {};
    expenses.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + parseFloat(item.price);
    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);

    if (labels.length > 0) {
        let maxCategory = labels[0];
        labels.forEach(cat => {
            if (categories[cat] > categories[maxCategory]) {
                maxCategory = cat;
            }
        });
        topExpenseNotice.innerHTML = `🔥 Bu ay ən çox xərc çəkilən sahə: <strong>${maxCategory}</strong> (${categories[maxCategory].toFixed(2)} ₼)`;
    } else {
        topExpenseNotice.innerHTML = "Hələ ki, heç bir xərc daxil edilməyib.";
    }

    const canvasElem = document.getElementById('categoryChart');
    if (!canvasElem) return;
    
    const ctx = canvasElem.getContext('2d');
    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Kateqoriyalar üzrə Xərc Paylanması'
                }
            }
        }
    });
}