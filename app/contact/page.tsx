'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Car, MessageCircle, Mail, Phone, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from 'framer-motion';

type RequestType = 'achat' | 'recherche_personnalisee';
type Deadline = 'immediat' | 'moins_1_mois' | '1_3_mois' | 'pas_presse';
type FuelType = 'essence' | 'diesel' | 'hybride' | 'electrique';
type Transmission = 'manuelle' | 'automatique' | 'indifferent';
type SearchCountry = 'france' | 'allemagne' | 'belgique' | 'autre';
type ImportantCriteria = 'faible_kilometrage' | 'historique_clair' | 'entretien_complet' | 'premiere_main' | 'vehicule_francais' | 'importe_accepte';

export default function ContactPage() {
  // URL Calendly
  const calendlyUrl = "https://calendly.com/autoval/call";
  const [showCalendly, setShowCalendly] = useState(false);

  // Fonction pour ouvrir Calendly en popup
  const openCalendlyPopup = () => {
    setShowCalendly(true);
  };
  
  // Fonction pour ouvrir Calendly dans un nouvel onglet
  const openCalendlyInNewTab = () => {
    if (typeof window !== 'undefined' && window.open) {
      window.open(calendlyUrl, '_blank');
    }
  };

  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    // 1. Informations de contact
    name: "",
    email: "",
    phone: "",
    
    // 2. Type de recherche
    requestType: "" as RequestType | "",
    deadline: "" as Deadline | "",
    
    // 3. Véhicule recherché
    brand: "",
    model: "",
    yearMin: "",
    yearMax: "",
    fuelType: "" as FuelType | "",
    transmission: "" as Transmission | "",
    maxMileage: "",
    
    // 4. Budget
    maxBudget: "",
    flexibleBudget: false,
    
    // 5. Critères importants
    importantCriteria: [] as ImportantCriteria[],
    
    // 6. Options souhaitées
    requiredOptions: "",
    appreciatedOptions: "",
    
    // 7. Pays de recherche
    searchCountry: "" as SearchCountry | "",
    otherCountry: "",
    
    // 8. Commentaires complémentaires
    comments: "",
    
    // 9. Validation
    confirmInfo: false,
    acceptContact: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    if (!formData.confirmInfo) {
      toast.error("Veuillez confirmer que les informations sont exactes");
      return;
    }
    
    if (!formData.requestType) {
      toast.error("Veuillez sélectionner le type de demande");
      return;
    }
    
    if (!formData.deadline) {
      toast.error("Veuillez sélectionner un délai souhaité");
      return;
    }
    
    if (formData.searchCountry === 'autre' && !formData.otherCountry) {
      toast.error("Veuillez préciser le pays si vous avez sélectionné 'Autre'");
      return;
    }
    
    setSending(true);
    
    try {
      // Préparer les données pour l'API
      const submitData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        requestType: formData.requestType,
        deadline: formData.deadline,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        yearMin: formData.yearMin ? parseInt(formData.yearMin) : undefined,
        yearMax: formData.yearMax ? parseInt(formData.yearMax) : undefined,
        fuelType: formData.fuelType || undefined,
        transmission: formData.transmission || undefined,
        maxMileage: formData.maxMileage ? parseInt(formData.maxMileage) : undefined,
        maxBudget: formData.maxBudget ? parseInt(formData.maxBudget) : undefined,
        flexibleBudget: formData.flexibleBudget,
        importantCriteria: formData.importantCriteria.length > 0 ? formData.importantCriteria : undefined,
        requiredOptions: formData.requiredOptions || undefined,
        appreciatedOptions: formData.appreciatedOptions || undefined,
        searchCountry: formData.searchCountry || undefined,
        otherCountry: formData.otherCountry || undefined,
        comments: formData.comments || undefined,
        confirmInfo: formData.confirmInfo,
        acceptContact: formData.acceptContact,
      };

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du formulaire');
      }

      toast.success("Formulaire envoyé avec succès !", {
        description: "Nous vous répondrons dans les plus brefs délais.",
      });
      
      // Réinitialiser le formulaire
      setFormData({
        name: "",
        email: "",
        phone: "",
        requestType: "" as RequestType | "",
        deadline: "" as Deadline | "",
        brand: "",
        model: "",
        yearMin: "",
        yearMax: "",
        fuelType: "" as FuelType | "",
        transmission: "" as Transmission | "",
        maxMileage: "",
        maxBudget: "",
        flexibleBudget: false,
        importantCriteria: [],
        requiredOptions: "",
        appreciatedOptions: "",
        searchCountry: "" as SearchCountry | "",
        otherCountry: "",
        comments: "",
        confirmInfo: false,
        acceptContact: false,
      });
    } catch (error: any) {
      console.error('Erreur envoi formulaire:', error);
      toast.error("Erreur lors de l'envoi du formulaire", {
        description: error.message || "Veuillez réessayer plus tard.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleCheckboxChange = (field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked,
    }));
  };

  const handleCriteriaChange = (criterion: ImportantCriteria, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      importantCriteria: checked
        ? [...prev.importantCriteria, criterion]
        : prev.importantCriteria.filter(c => c !== criterion),
    }));
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-16 sm:pt-20">
      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
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
              <Car className="size-3 sm:size-4 mr-2 inline" />
              Demande de véhicule
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium text-white px-2">
              Formulaire de demande
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                de véhicule
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Complétez ce formulaire afin que nous puissions vous proposer un véhicule correspondant exactement à vos critères.
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
                  <MessageCircle className="size-5 sm:size-6 text-blue-400" />
                  Formulaire de demande de véhicule – Autovalia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* 1. Informations de contact */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      1. Informations de contact
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">Nom & Prénom *</Label>
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
                        <Label htmlFor="email" className="text-white">Adresse e-mail *</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">Numéro de téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="06 12 34 56 78"
                        value={formData.phone}
                        onChange={handleChange}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* 2. Type de recherche */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      2. Type de recherche
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Votre demande concerne *</Label>
                        <RadioGroup
                          value={formData.requestType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, requestType: value as RequestType }))}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="achat" id="achat" />
                            <Label htmlFor="achat" className="text-white cursor-pointer">Achat de véhicule</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="recherche_personnalisee" id="recherche_personnalisee" />
                            <Label htmlFor="recherche_personnalisee" className="text-white cursor-pointer">Recherche personnalisée (sur mesure)</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Délai souhaité *</Label>
                        <RadioGroup
                          value={formData.deadline}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, deadline: value as Deadline }))}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="immediat" id="immediat" />
                            <Label htmlFor="immediat" className="text-white cursor-pointer">Immédiat</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="moins_1_mois" id="moins_1_mois" />
                            <Label htmlFor="moins_1_mois" className="text-white cursor-pointer">Moins de 1 mois</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1_3_mois" id="1_3_mois" />
                            <Label htmlFor="1_3_mois" className="text-white cursor-pointer">1 à 3 mois</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pas_presse" id="pas_presse" />
                            <Label htmlFor="pas_presse" className="text-white cursor-pointer">Pas pressé</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  {/* 3. Véhicule recherché */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      3. Véhicule recherché
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand" className="text-white">Marque souhaitée</Label>
                        <Input
                          id="brand"
                          placeholder="Ex: Peugeot"
                          value={formData.brand}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model" className="text-white">Modèle souhaité</Label>
                        <Input
                          id="model"
                          placeholder="Ex: 308"
                          value={formData.model}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="yearMin" className="text-white">Année minimale</Label>
                        <Input
                          id="yearMin"
                          type="number"
                          placeholder="Ex: 2020"
                          min="1990"
                          max={new Date().getFullYear()}
                          value={formData.yearMin}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="yearMax" className="text-white">Année maximale</Label>
                        <Input
                          id="yearMax"
                          type="number"
                          placeholder="Ex: 2024"
                          min="1990"
                          max={new Date().getFullYear()}
                          value={formData.yearMax}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Motorisation</Label>
                        <RadioGroup
                          value={formData.fuelType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, fuelType: value as FuelType }))}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="essence" id="essence" />
                            <Label htmlFor="essence" className="text-white cursor-pointer">Essence</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="diesel" id="diesel" />
                            <Label htmlFor="diesel" className="text-white cursor-pointer">Diesel</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="hybride" id="hybride" />
                            <Label htmlFor="hybride" className="text-white cursor-pointer">Hybride</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="electrique" id="electrique" />
                            <Label htmlFor="electrique" className="text-white cursor-pointer">Électrique</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Boîte de vitesse</Label>
                        <RadioGroup
                          value={formData.transmission}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, transmission: value as Transmission }))}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manuelle" id="manuelle" />
                            <Label htmlFor="manuelle" className="text-white cursor-pointer">Manuelle</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="automatique" id="automatique" />
                            <Label htmlFor="automatique" className="text-white cursor-pointer">Automatique</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="indifferent" id="indifferent" />
                            <Label htmlFor="indifferent" className="text-white cursor-pointer">Indifférent</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxMileage" className="text-white">Kilométrage maximum</Label>
                        <Input
                          id="maxMileage"
                          type="number"
                          placeholder="Ex: 50000"
                          min="0"
                          value={formData.maxMileage}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Budget */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      4. Budget
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxBudget" className="text-white">Budget maximum (€)</Label>
                        <Input
                          id="maxBudget"
                          type="number"
                          placeholder="Ex: 25000"
                          min="0"
                          value={formData.maxBudget}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Budget flexible</Label>
                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id="flexibleBudget"
                            checked={formData.flexibleBudget}
                            onCheckedChange={(checked) => handleCheckboxChange('flexibleBudget', checked === true)}
                          />
                          <Label htmlFor="flexibleBudget" className="text-white cursor-pointer">Oui</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Critères importants */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      5. Critères importants
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { value: 'faible_kilometrage' as ImportantCriteria, label: 'Faible kilométrage' },
                        { value: 'historique_clair' as ImportantCriteria, label: 'Historique clair / non accidenté' },
                        { value: 'entretien_complet' as ImportantCriteria, label: 'Entretien complet' },
                        { value: 'premiere_main' as ImportantCriteria, label: 'Première main' },
                        { value: 'vehicule_francais' as ImportantCriteria, label: 'Véhicule français' },
                        { value: 'importe_accepte' as ImportantCriteria, label: 'Véhicule importé accepté' },
                      ].map((criterion) => (
                        <div key={criterion.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={criterion.value}
                            checked={formData.importantCriteria.includes(criterion.value)}
                            onCheckedChange={(checked) => handleCriteriaChange(criterion.value, checked === true)}
                          />
                          <Label htmlFor={criterion.value} className="text-white cursor-pointer text-sm">
                            {criterion.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Options souhaitées */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      6. Options souhaitées (facultatif)
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="requiredOptions" className="text-white">Options indispensables</Label>
                        <Textarea
                          id="requiredOptions"
                          placeholder="Ex: GPS, Climatisation, Toit ouvrant..."
                          rows={3}
                          value={formData.requiredOptions}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="appreciatedOptions" className="text-white">Options appréciées</Label>
                        <Textarea
                          id="appreciatedOptions"
                          placeholder="Ex: Sièges cuir, Caméra de recul..."
                          rows={3}
                          value={formData.appreciatedOptions}
                          onChange={handleChange}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 7. Pays de recherche */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      7. Pays de recherche
                    </h2>
                    <RadioGroup
                      value={formData.searchCountry}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, searchCountry: value as SearchCountry }))}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="france" id="france" />
                        <Label htmlFor="france" className="text-white cursor-pointer">France</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="allemagne" id="allemagne" />
                        <Label htmlFor="allemagne" className="text-white cursor-pointer">Allemagne</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="belgique" id="belgique" />
                        <Label htmlFor="belgique" className="text-white cursor-pointer">Belgique</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="autre" id="autre" />
                        <Label htmlFor="autre" className="text-white cursor-pointer">Autre</Label>
                      </div>
                    </RadioGroup>
                    {formData.searchCountry === 'autre' && (
                      <div className="space-y-2">
                        <Label htmlFor="otherCountry" className="text-white">Précisez le pays *</Label>
                        <Input
                          id="otherCountry"
                          placeholder="Ex: Espagne"
                          value={formData.otherCountry}
                          onChange={handleChange}
                          required={formData.searchCountry === 'autre'}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* 8. Commentaires complémentaires */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      8. Commentaires complémentaires
                    </h2>
                    <div className="space-y-2">
                      <Textarea
                        id="comments"
                        placeholder="Ajoutez toute information complémentaire qui pourrait nous aider..."
                        rows={5}
                        value={formData.comments}
                        onChange={handleChange}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* 9. Validation */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      9. Validation
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="confirmInfo"
                          checked={formData.confirmInfo}
                          onCheckedChange={(checked) => handleCheckboxChange('confirmInfo', checked === true)}
                          required
                        />
                        <Label htmlFor="confirmInfo" className="text-white cursor-pointer text-sm">
                          Je confirme que ces informations sont exactes et j'autorise Autovalia à effectuer une recherche de véhicule selon mes critères. *
                        </Label>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="acceptContact"
                          checked={formData.acceptContact}
                          onCheckedChange={(checked) => handleCheckboxChange('acceptContact', checked === true)}
                        />
                        <Label htmlFor="acceptContact" className="text-white cursor-pointer text-sm">
                          J'accepte d'être recontacté concernant cette demande.
                        </Label>
                      </div>
                    </div>
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
                        <span>Envoyer la demande</span>
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
