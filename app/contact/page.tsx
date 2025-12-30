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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    setTimeout(() => {
      setSending(false);
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
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Gradient Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1">
              <MessageCircle className="size-4 mr-2 inline" />
              Contactez-nous
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium text-white">
              Nous sommes là
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                pour vous aider
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Une question sur votre projet automobile ? Notre équipe vous répond rapidement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-12 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
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
                      <a href="mailto:contact@autoia.fr" className="text-blue-400 hover:text-blue-300 transition-colors">
                        contact@autoia.fr
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

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                      <MapPin className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">Adresse</h3>
                      <p className="text-gray-400 text-sm">
                        123 Avenue de l&apos;Innovation<br />
                        75001 Paris, France
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendly Card */}
              <Card className="bg-gradient-to-br from-green-600/10 to-blue-600/10 backdrop-blur-xl border-green-500/30 hover:bg-green-600/20 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
                        <Calendar className="size-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium mb-1">Réserver un rendez-vous</h3>
                        <p className="text-gray-400 text-sm">
                          Planifiez un appel de 30 minutes pour discuter de votre projet
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={openCalendlyPopup}
                        className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                      >
                        <Calendar className="size-4 mr-2" />
                        Réserver maintenant
                      </Button>
                      <Button
                        variant="outline"
                        onClick={openCalendlyInNewTab}
                        className="border-white/20 text-white hover:bg-white/10"
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white text-2xl">
                    <Send className="size-6 text-blue-400" />
                    Envoyez-nous un message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
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

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-white">Téléphone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="06 12 34 56 78"
                          value={formData.phone}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-white">Sujet *</Label>
                        <Input
                          id="subject"
                          placeholder="Objet de votre message"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-white">Expliquez votre projet auto *</Label>
                      <Textarea
                        id="message"
                        placeholder="Décrivez-nous votre projet, vos besoins, vos questions..."
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full"
                      disabled={sending}
                    >
                      {sending ? (
                        <>
                          <Send className="size-5 mr-2 animate-pulse" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="size-5 mr-2" />
                          Envoyer le message
                        </>
                      )}
                    </Button>

                    <p className="text-sm text-gray-500 text-center">
                      * Champs obligatoires. Nous nous engageons à répondre sous 24h ouvrées.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Calendly Section */}
      <section className="py-12 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-green-600/10 via-blue-600/10 to-purple-600/10 backdrop-blur-xl border-green-500/30 shadow-2xl">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2 mb-4">
                      <Calendar className="size-5 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">Rendez-vous en ligne</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-medium text-white mb-4">
                      Préférez un appel ?
                    </h2>
                    <p className="text-lg text-gray-400 mb-6 max-w-2xl">
                      Réservez un créneau de 30 minutes pour discuter de votre projet automobile. Nous répondrons à toutes vos questions et vous guiderons dans votre recherche.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowCalendly(true)}
                        size="lg"
                        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg shadow-green-500/25"
                      >
                        <Calendar className="size-5 mr-2" />
                        Réserver un appel gratuit
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={openCalendlyInNewTab}
                        className="border-white/20 text-white hover:bg-white/10"
                        title="Ouvrir Calendly dans un nouvel onglet"
                      >
                        ↗ Ouvrir dans un nouvel onglet
                      </Button>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-green-500/30">
                      <Calendar className="size-16 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Dialog Calendly Inline */}
      <Dialog open={showCalendly} onOpenChange={setShowCalendly}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-medium text-white flex items-center gap-2">
                  <Calendar className="size-6 text-green-400" />
                  Réserver un rendez-vous
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-2">
                  Sélectionnez un créneau de 30 minutes pour discuter de votre projet automobile
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCalendly(false)}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="size-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-hidden" style={{ height: 'calc(90vh - 120px)' }}>
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
