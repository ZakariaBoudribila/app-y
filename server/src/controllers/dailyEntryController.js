const JournalModel = require('../models/dailyEntryModel');

function isValidISODate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

exports.getJournalEntry = (req, res) => {
    const { date } = req.query;
    if (!isValidISODate(date)) {
        return res.status(400).json({ error: "Le paramètre 'date' est requis (YYYY-MM-DD)." });
    }
    JournalModel.getEntryByDate(req.userData.id, date, (err, entry) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(entry || { content: '', mood_score: 5 });
    });
};

exports.saveJournalEntry = (req, res) => {
    const { date, content, mood_score } = req.body;

    if (!isValidISODate(date)) {
        return res.status(400).json({ error: "Le champ 'date' est requis (YYYY-MM-DD)." });
    }

    const safeContent = typeof content === 'string' ? content : null;
    const safeMoodScore = typeof mood_score === 'number' ? mood_score : null;

    JournalModel.saveEntry(req.userData.id, date, safeContent, safeMoodScore, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Journal sauvegardé" });
    });
};