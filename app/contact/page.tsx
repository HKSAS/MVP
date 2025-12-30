'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, MapPin, Send, MessageCircle, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from 'framer-motion';

export default function ContactPage() {
  // URL Calendly
  const calendlyUrl = "https://calendly.com/kamelhadri94/30min";
  const [showCalendly, setShowCalendly] = useState(false);

  // Pas besoin de charger le script Calendly, on utilise un iframe direct

  // Fonction pour ouvrir Calendly en popup (fallback)
  const openCalendlyPopup = () => {
    setShowCalendly(true);
  };
  
  // Fonction pour ouvrir Calendly dans un nouvel onglet (fallback)
  const openCalendlyInNewTab = () => {
    if (typeof window !== 'undefined' && window.open) {
      window.open(calendlyUrl, '_blank');
    }
  };

  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du message');
      }

      toast.success("Message envoyé avec succès !", {
        description: "Nous vous répondrons dans les plus brefs délais.",
      });
      
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error: any) {
      console.error('Erreur envoi message:', error);
      toast.error("Erreur lors de l'envoi du message", {
        description: error.message || "Veuillez réessayer plus tard.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-16 sm:pt-20">
      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
        {/* Gradient Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/3 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/3 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-6"
          >
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-3 sm:px-4 py-1 text-xs sm:text-sm">
              <MessageCircle className="size-3 sm:size-4 mr-2 inline" />
              Contactez-nous
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium text-white px-2">
              Nous sommes là
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                pour vous aider
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Une question sur votre projet automobile ? Notre équipe vous répond rapidement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Info */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                      <Mail className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">Email</h3>
                      <a href="mailto:contact@autovalia.fr" className="text-blue-400 hover:text-blue-300 transition-colors">
                        contact@autovalia.fr
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        Réponse sous 24h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                      <Phone className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">Téléphone</h3>
                      <a href="tel:+33768573285" className="text-blue-400 hover:text-blue-300 transition-colors">
                        07 68 57 32 85
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        Lun-Ven, 9h-18h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendly Card */}
              <Card className="bg-gradient-to-br from-green-600/10 to-blue-600/10 backdrop-blur-xl border-green-500/30 hover:bg-green-600/20 transition-all">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
                        <Calendar className="size-5 sm:size-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base text-white font-medium mb-1">Réserver un rendez-vous</h3>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Planifiez un appel de 30 minutes pour discuter de votre projet
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={openCalendlyPopup}
                        className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white text-xs sm:text-sm h-9 sm:h-10"
                      >
                        <Calendar className="size-3 sm:size-4 mr-2" />
                        Réserver maintenant
                      </Button>
                      <Button
                        variant="outline"
                        onClick={openCalendlyInNewTab}
                        className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm h-9 sm:h-10"
                        title="Ouvrir Calendly dans un nouvel onglet"
                      >
                        ↗
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Form */}
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-white text-xl sm:text-2xl">
                    <Send className="size-5 sm:size-6 text-blue-400" />
                    Envoyez-nous un message
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">Nom complet *</Label>
                        <Input
                          id="name"
                          placeholder="Jean Dupont"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="jean.dupont@email.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm sm:text-base text-white">Téléphone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="06 12 34 56 78"
                          value={formData.phone}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 text-sm sm:text-base h-10 sm:h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-sm sm:text-base text-white">Sujet *</Label>
                        <Input
                          id="subject"
                          placeholder="Objet de votre message"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 text-sm sm:text-base h-10 sm:h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm sm:text-base text-white">Expliquez votre projet auto *</Label>
                      <Textarea
                        id="message"
                        placeholder="Décrivez-nous votre projet, vos besoins, vos questions..."
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 resize-none text-sm sm:text-base"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full h-11 sm:h-12 text-sm sm:text-base"
                      disabled={sending}
                    >
                      {sending ? (
                        <>
                          <Send className="size-4 sm:size-5 mr-2 animate-pulse" />
                          <span>Envoi en cours...</span>
                        </>
                      ) : (
                        <>
                          <Send className="size-4 sm:size-5 mr-2" />
                          <span>Envoyer le message</span>
                        </>
                      )}
                    </Button>

                    <p className="text-xs sm:text-sm text-gray-500 text-center">
                      * Champs obligatoires. Nous nous engageons à répondre sous 24h ouvrées.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Dialog Calendly Inline */}
      <Dialog open={showCalendly} onOpenChange={setShowCalendly}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-5xl max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden w-[95vw] sm:w-full">
          <DialogHeader className="p-4 sm:p-6 border-b border-white/10">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl md:text-2xl font-medium text-white flex items-center gap-2">
                  <Calendar className="size-5 sm:size-6 text-green-400 flex-shrink-0" />
                  <span>Réserver un rendez-vous</span>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">
                  Sélectionnez un créneau de 30 minutes pour discuter de votre projet automobile
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCalendly(false)}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
              >
                <X className="size-4 sm:size-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-hidden" style={{ height: 'calc(95vh - 100px)', minHeight: '400px' }}>
            {/* Widget Calendly en iframe direct */}
            {showCalendly && (
              <iframe
                src={calendlyUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                style={{
                  border: 'none',
                  display: 'block',
                  width: '100%',
                  height: '100%',
                }}
                title="Calendly Scheduling Page"
                allow="camera; microphone; geolocation"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
