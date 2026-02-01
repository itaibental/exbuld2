/**
 * ניהול ארכיון המבחנים
 */
let archiveList = [];

function initArchive() {
    const localData = localStorage.getItem('examArchive_v1');
    if (localData) {
        archiveList = JSON.parse(localData);
    } else if (typeof examsDB !== 'undefined' && examsDB.length > 0) {
        archiveList = [...examsDB];
        localStorage.setItem('examArchive_v1', JSON.stringify(archiveList));
    }
    renderArchive();
}

function renderArchive() {
    const grid = document.getElementById('examGrid');
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    grid.innerHTML = '';
    const filtered = archiveList.filter(exam => 
        exam.name.toLowerCase().includes(searchTerm) || 
        exam.year.toString().includes(searchTerm)
    );
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; color:#7f8c8d; margin-top:30px;">
            <h3>לא נמצאו מבחנים בארכיון</h3>
            <p>מורה? הכנס למצב ניהול כדי להוסיף מבחנים.</p>
        </div>`;
        return;
    }
    filtered.sort((a, b) => b.year - a.year);
    filtered.forEach(exam => {
        const card = document.createElement('div');
        card.className = 'exam-card';
        card.innerHTML = `
            <div class="exam-year">${exam.year}</div>
            <div class="exam-icon">📄</div>
            <div class="exam-name">${exam.name}</div>
            <div class="exam-date">עודכן: ${new Date(exam.dateAdded).toLocaleDateString()}</div>
        `;
        card.onclick = () => {
            const path = 'exam/' + (exam.fileName || exam.filePath);
            window.open(path, '_blank');
        };
        if (document.getElementById('adminPanel').style.display !== 'none') {
            const delBtn = document.createElement('button');
            delBtn.innerText = '❌';
            delBtn.style.cssText = 'position:absolute; top:10px; left:10px; background:red; border:none; border-radius:50%; width:30px; height:30px; color:white; cursor:pointer; font-size:12px; padding:0;';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteExam(exam.id);
            };
            card.appendChild(delBtn);
        }
        grid.appendChild(card);
    });
}

function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    const isHidden = panel.style.display === 'none';
    if (isHidden) {
        const pass = prompt('הכנס סיסמת ניהול:');
        if (pass === '1234') {
            panel.style.display = 'block';
            renderArchive();
        } else {
            alert('סיסמה שגויה');
        }
    } else {
        panel.style.display = 'none';
        renderArchive();
    }
}

function addExamToArchive() {
    const nameInput = document.getElementById('newExamName');
    const yearInput = document.getElementById('newExamYear');
    const fileNameInput = document.getElementById('newExamFileName');
    if (!nameInput.value || !yearInput.value || !fileNameInput.value) {
        alert('נא למלא את כל השדות');
        return;
    }
    const newExam = {
        id: Date.now(),
        name: nameInput.value,
        year: parseInt(yearInput.value),
        fileName: fileNameInput.value.trim(), 
        filePath: fileNameInput.value.trim(),
        dateAdded: Date.now()
    };
    archiveList.push(newExam);
    saveToLocal();
    nameInput.value = '';
    yearInput.value = '';
    fileNameInput.value = '';
    document.getElementById('fileHelper').value = ''; 
    renderArchive();
    alert(`המבחן נוסף לרשימה!\n\nחשוב: כדי שהתלמידים יוכלו לפתוח את המבחן, עליך להעתיק את הקובץ "${newExam.fileName}" לתיקייה "exam/" בשרת.`);
}

function deleteExam(id) {
    if(confirm('האם למחוק מבחן זה מהרשימה?')) {
        archiveList = archiveList.filter(e => e.id !== id);
        saveToLocal();
        renderArchive();
    }
}

function clearArchive() {
    if(confirm('פעולה זו תמחק את כל הרשימה. האם להמשיך?')) {
        archiveList = [];
        saveToLocal();
        renderArchive();
    }
}

function saveToLocal() {
    localStorage.setItem('examArchive_v1', JSON.stringify(archiveList));
}

function downloadDataFile() {
    const content = `// קובץ נתונים - ארכיון מבחנים\n// עדכון אחרון: ${new Date().toLocaleString()}\n\nconst examsDB = ${JSON.stringify(archiveList, null, 4)};`;
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exams_data.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert('הקובץ exams_data.js ירד למחשבך.\n\nכדי לעדכן את האתר לכולם:\n1. העלה את הקובץ הזה לתיקיית האתר.\n2. וודא שקבצי ה-HTML של המבחנים שהוספת נמצאים בתיקיית "exam/".');
}

window.onload = initArchive;
