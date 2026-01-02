/**
 * FONCTIONS UTILITAIRES
 * - Analyse d'intention
 * - Base de connaissances FAQ
 * - Détection de mots-clés
 */

export function analyzeIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Détection d'intention basique
  if (lowerMessage.match(/\b(rdv|rendez-vous|réserver|disponibilit|prendre|calendly)\b/)) {
    return 'appointment';
  }
  
  if (lowerMessage.match(/\b(prix|tarif|coût|devis|combien|abonnement|pack)\b/)) {
    return 'pricing';
  }
  
  if (lowerMessage.match(/\b(horaire|ouvert|ferme|heure|contact)\b/)) {
    return 'hours';
  }
  
  if (lowerMessage.match(/\b(service|prestation|fonctionnalit|recherche|analyse)\b/)) {
    return 'services';
  }
  
  if (lowerMessage.match(/\b(quota|limite|nombre|analyses)\b/)) {
    return 'quota';
  }
  
  if (lowerMessage.match(/\b(urgence|urgent|problème|aide|support)\b/)) {
    return 'support';
  }
  
  return 'general';
}

// Fonction pour détecter si la question nécessite Calendly
export function needsCalendlyRedirect(message: string, intent: string): boolean {
  const appointmentKeywords = [
    'rdv', 'rendez-vous', 'réserver', 'réservation', 'prendre',
    'disponible', 'disponibilité', 'créneau', 'quand', 'date', 'calendly',
    'démonstration', 'démo', 'présentation'
  ];
  
  const technicalKeywords = [
    'problème', 'aide', 'support', 'question', 'explication',
    'détaillé', 'personnalisé', 'discuter'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Si intention de RDV détectée
  if (intent === 'appointment') return true;
  
  // Si mots-clés RDV présents
  if (appointmentKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }
  
  // Si demande de support complexe
  if (technicalKeywords.filter(keyword => lowerMessage.includes(keyword)).length >= 2) {
    return true;
  }
  
  return false;
}

