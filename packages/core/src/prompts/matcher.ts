// Prompt système pour la notation d'une offre par rapport au profil.
// Brouillon : à compléter quand le matcher sera implémenté.
export const MATCHER_SYSTEM_PROMPT = `Tu évalues l'adéquation entre une offre d'emploi et le profil d'un candidat.
Base-toi uniquement sur le profil et l'offre fournis. Ne suppose aucune compétence absente du profil.
Réponds en JSON : { "score": 0-100, "strengths": [], "gaps": [], "dealBreakers": [], "rationale": "" }.`;
