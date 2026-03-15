// Placeholders: prêt pour une intégration Gemini / OpenAI.
// Exemple futur: lire process.env.GEMINI_API_KEY ou process.env.OPENAI_API_KEY.

exports.chatWithAI = async (req, res) => {
  // TODO: implémenter l'assistant IA (Gemini/OpenAI)
  return res.status(501).json({ message: 'Not implemented.' });
};

exports.reorderTasksWithAI = async (req, res) => {
  // TODO: implémenter le tri intelligent des tâches
  return res.status(501).json({ message: 'Not implemented.' });
};
