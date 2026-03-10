const db = require('../config/database');

function isValidIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

exports.getSummary = (req, res) => {
  const userId = req.userData.id;
  const { from, to } = req.query;

  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return res.status(400).json({ error: "Paramètres 'from' et 'to' requis (YYYY-MM-DD)" });
  }

  const days = Object.create(null);

  const tasksSql = `
    SELECT
      task_date AS date,
      COUNT(*) AS tasks_total,
      SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS tasks_completed
    FROM tasks
    WHERE user_id = ? AND task_date BETWEEN ? AND ?
    GROUP BY task_date
  `;

  const journalSql = `
    SELECT
      entry_date AS date,
      mood_score AS mood_score,
      CASE
        WHEN journal_content IS NOT NULL AND LENGTH(TRIM(journal_content)) > 0 THEN 1
        ELSE 0
      END AS has_journal
    FROM daily_entries
    WHERE user_id = ? AND entry_date BETWEEN ? AND ?
  `;

  db.all(tasksSql, [userId, from, to], (taskErr, taskRows) => {
    if (taskErr) {
      console.error('history summary tasks error:', taskErr);
      return res.status(500).json({ error: 'Erreur DB (tasks)' });
    }

    for (const row of taskRows || []) {
      days[row.date] = {
        ...(days[row.date] || {}),
        tasks_total: Number(row.tasks_total || 0),
        tasks_completed: Number(row.tasks_completed || 0),
      };
    }

    db.all(journalSql, [userId, from, to], (journalErr, journalRows) => {
      if (journalErr) {
        console.error('history summary journal error:', journalErr);
        return res.status(500).json({ error: 'Erreur DB (journal)' });
      }

      for (const row of journalRows || []) {
        days[row.date] = {
          ...(days[row.date] || {}),
          has_journal: !!row.has_journal,
          mood_score: row.mood_score === null || row.mood_score === undefined ? null : Number(row.mood_score),
        };
      }

      return res.json({ from, to, days });
    });
  });
};
