const ExamState = {
    questions: [],
    instructions: { general: '', parts: {} },
    addQuestion(partId) {
        const q = { id: Date.now(), part: partId, text: '', points: 10, subQuestions: [] };
        this.questions.push(q);
        return q;
    },
    addSubQuestion(qId) {
        const q = this.questions.find(item => item.id === qId);
        if (q) q.subQuestions.push({ id: Date.now(), text: '', points: 5 });
    }
};