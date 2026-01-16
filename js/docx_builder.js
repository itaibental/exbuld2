const DocxBuilder = {
    generate: function(state) {
        let content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>${state.examTitle}</title>
        <style>body{font-family: Arial, sans-serif; direction: rtl;} .question-box{margin-bottom:20px;border-bottom:1px solid #eee;padding-bottom:15px;} .sub-q{margin-right:20px;margin-top:10px;} .answer-space{margin-top:10px;color:#999;} img{max-width:400px;height:auto;display:block;margin:10px 0;}</style></head><body>`;

        if (state.logoData) { content += `<div style="text-align:center"><img src="${state.logoData}" alt="Logo"></div>`; }
        content += `<h1 style="text-align:center;">${state.examTitle}</h1>`;
        if (state.instructions.general) { content += `<div style="background:#f0f0f0; padding:10px; margin-bottom:20px;"><strong>הנחיות:</strong><br>${state.instructions.general.replace(/\n/g, '<br>')}</div>`; }

        state.parts.forEach(part => {
            content += `<h2>${part.name}</h2>`;
            if (state.instructions.parts[part.id]) { content += `<p><em>${state.instructions.parts[part.id].replace(/\n/g, '<br>')}</em></p>`; }
            const questions = state.questions.filter(q => q.part === part.id);
            if (questions.length === 0) { content += `<p>(אין שאלות בחלק זה)</p>`; } else {
                questions.forEach((q, idx) => {
                    content += `<div class="question-box"><p><strong>שאלה ${idx + 1}</strong> (${q.points} נקודות)</p><p>${q.text.replace(/\n/g, '<br>')}</p>`;
                    // שימוש ב-Utils כדי לסדר את התמונה לוורד
                    if (q.imageUrl) { content += `<img src="${Utils.getImageSrc(q.imageUrl)}" />`; }
                    if (q.subQuestions && q.subQuestions.length > 0) {
                        q.subQuestions.forEach((sq, si) => {
                            const label = ExamState.subLabels[si] || (si + 1); // Accessing global state here, assume ExamState is global or passed
                            content += `<div class="sub-q"><p><strong>סעיף ${label}'</strong> (${sq.points} נק'): ${sq.text}</p><p class="answer-space">_________________________________________________<br>_________________________________________________</p></div>`;
                        });
                    } else { content += `<p class="answer-space"><br>_________________________________________________<br>_________________________________________________<br>_________________________________________________</p>`; }
                    content += `</div>`;
                });
            }
        });
        content += `</body></html>`;
        return content;
    }
};
