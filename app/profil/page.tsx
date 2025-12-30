'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Calendar,
  Shield,
  Bell,
  CreditCard,
  Edit,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "France",
  });
  const [originalProfileData, setOriginalProfileData] = useState(profileData);
  const [isEditing, setIsEditing] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [stats, setStats] = useState({
    memberSince: "",
    subscription: "Gratuit",
    subscriptionStatus: "Actif",
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      
      // Récupérer l'utilisateur authentifié
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Charger les données du profil depuis la table profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erreur chargement profil:', profileError);
      }

      // Préparer les données du profil
      const email = session.user.email || '';
      
      // Extraire firstName et lastName depuis full_name
      let firstName = '';
      let lastName = '';
      if (profile?.full_name) {
        const nameParts = profile.full_name.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else {
        // Fallback: utiliser l'email comme prénom si full_name n'existe pas
        firstName = email.split('@')[0] || '';
      }
      
      console.log('[Profile] Données chargées du profil:', {
        profile,
        full_name: profile?.full_name,
        firstName,
        lastName,
        email,
      });
      
      const data = {
        firstName: firstName || '',
        lastName: lastName || '',
        email,
        phone: profile?.phone || '',
        address: profile?.address || '',
        city: profile?.city || '',
        postalCode: profile?.postal_code || '',
        country: profile?.country || 'France',
      };

      setProfileData(data);
      setOriginalProfileData(data);

      // Calculer les statistiques
      const memberSince = session.user.created_at 
        ? new Date(session.user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        : 'Récemment';
      
      // Vérifier le statut d'abonnement (vous pouvez adapter selon votre logique)
      const subscription = profile?.subscription_type || 'Gratuit';
      const subscriptionStatus = profile?.subscription_status || 'Actif';

      setStats({
        memberSince,
        subscription,
        subscriptionStatus,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const supabase = getSupabaseBrowserClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Session expirée');
        return;
      }

      // Mettre à jour l'email dans auth si nécessaire
      if (profileData.email !== originalProfileData.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email,
        });

        if (emailError) {
          throw new Error(emailError.message || 'Erreur lors de la mise à jour de l\'email');
        }
      }

      // Mettre à jour ou créer le profil dans la table profiles
      const fullName = [profileData.firstName, profileData.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || null;
      
      // Sauvegarder d'abord les champs de base (qui existent certainement)
      const baseProfileUpdateData: any = {
        id: session.user.id,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      };

      // Tenter de sauvegarder avec toutes les colonnes
      const profileUpdateData: any = {
        ...baseProfileUpdateData,
        phone: profileData.phone || null,
        address: profileData.address || null,
        city: profileData.city || null,
        postal_code: profileData.postalCode || null,
        country: profileData.country || 'France',
      };

      console.log('[Profile] Données à sauvegarder:', profileUpdateData);

      // Essayer d'abord avec toutes les colonnes
      let { data: upsertData, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileUpdateData, {
          onConflict: 'id'
        })
        .select();

      // Si erreur due à des colonnes manquantes, sauvegarder seulement les champs de base
      if (profileError && (
        profileError.message.includes('Could not find') || 
        profileError.message.includes('column') ||
        profileError.message.includes('schema cache')
      )) {
        console.warn('[Profile] Colonnes manquantes détectées, sauvegarde avec champs de base uniquement');
        
        // Sauvegarder seulement full_name
        const { data: baseData, error: baseError } = await supabase
          .from('profiles')
          .upsert(baseProfileUpdateData, {
            onConflict: 'id'
          })
          .select();

        if (baseError) {
          console.error('[Profile] Erreur lors de la sauvegarde de base:', baseError);
          throw new Error(`Erreur lors de la sauvegarde du profil: ${baseError.message}`);
        }

        upsertData = baseData;
        
        // Afficher un avertissement à l'utilisateur
        toast.warning(
          'Le nom a été sauvegardé, mais certaines colonnes (téléphone, adresse) ne sont pas encore disponibles. ' +
          'Veuillez exécuter le script SQL add-profile-columns.sql dans Supabase pour activer ces fonctionnalités.',
          { duration: 8000 }
        );
      } else if (profileError) {
        // Autre type d'erreur
        console.error('[Profile] Erreur lors de la sauvegarde:', profileError);
        throw new Error(`Erreur lors de la sauvegarde du profil: ${profileError.message}`);
      }

      console.log('[Profile] Profil sauvegardé avec succès:', upsertData);

      // Recharger les données AVANT de mettre à jour l'état local
      await loadUserData();
      
      // Mettre à jour l'état après le rechargement
      setIsEditing(false);
      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde du profil');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      setChangingPassword(true);
      const supabase = getSupabaseBrowserClient();

      // Pour changer le mot de passe, Supabase nécessite de réauthentifier l'utilisateur
      // On utilise updateUser qui ne nécessite pas l'ancien mot de passe
      // Si vous voulez vérifier l'ancien mot de passe, vous devrez utiliser signInWithPassword d'abord
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors du changement de mot de passe');
      }

      toast.success('Mot de passe modifié avec succès');
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsChangingPassword(false);
      setChangingPassword(false);
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalProfileData);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-blue-400" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
        {/* Hero Section */}
        <section className="relative pt-32 pb-12 px-4">
          {/* Gradient Background Effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link href="/dashboard">
                <Button variant="ghost" className="text-gray-400 hover:text-white mb-6">
                  <ArrowLeft className="size-4 mr-2" />
                  Retour au dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="size-10 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl md:text-6xl font-medium text-white">
                    Mon profil
                  </h1>
                  <p className="text-xl text-gray-400 mt-2">
                    Gérez vos informations personnelles
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-4 relative">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Account Info */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="size-5 text-blue-400" />
                    Informations personnelles
                  </CardTitle>
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="size-4 mr-2" />
                      Modifier
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        <X className="size-4 mr-2" />
                        Annuler
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="size-4 mr-2" />
                            Enregistrer
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Prénom</Label>
                    <Input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                      disabled={!isEditing}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Nom</Label>
                    <Input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                      disabled={!isEditing}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                      <Mail className="size-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      disabled={!isEditing}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                      <Phone className="size-4" />
                      Téléphone
                    </Label>
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      disabled={!isEditing}
                      placeholder="06 12 34 56 78"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                      <MapPin className="size-4" />
                      Adresse
                    </Label>
                    <Input
                      type="text"
                      value={profileData.address}
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      disabled={!isEditing}
                      placeholder="15 rue de la République"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Ville</Label>
                    <Input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Paris"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Code postal</Label>
                    <Input
                      type="text"
                      value={profileData.postalCode}
                      onChange={(e) => setProfileData({...profileData, postalCode: e.target.value})}
                      disabled={!isEditing}
                      placeholder="75001"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Lock className="size-5 text-purple-400" />
                  Sécurité
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isChangingPassword ? (
                  <div>
                    <p className="text-gray-400 mb-4">
                      Modifiez votre mot de passe pour sécuriser votre compte
                    </p>
                    <Button 
                      variant="outline" 
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      <Lock className="size-4 mr-2" />
                      Changer le mot de passe
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Mot de passe actuel</Label>
                      <Input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Nouveau mot de passe</Label>
                      <Input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Confirmer le nouveau mot de passe</Label>
                      <Input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        }}
                        disabled={changingPassword}
                      >
                        <X className="size-4 mr-2" />
                        Annuler
                      </Button>
                      <Button 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
                        onClick={handlePasswordChange}
                        disabled={changingPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                      >
                        {changingPassword ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Modification...
                          </>
                        ) : (
                          <>
                            <Save className="size-4 mr-2" />
                            Enregistrer le mot de passe
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Membre depuis</span>
                    <Calendar className="size-5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-medium text-white">{stats.memberSince}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    {user?.created_at 
                      ? `Il y a ${Math.floor((new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))} mois`
                      : 'Récemment'}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Abonnement</span>
                    <CreditCard className="size-5 text-purple-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-medium text-white">{stats.subscription}</div>
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 border-none">{stats.subscriptionStatus}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Statut actuel</p>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Sécurité</span>
                    <Shield className="size-5 text-green-400" />
                  </div>
                  <div className="text-2xl font-medium text-green-400">Sécurisé</div>
                  <p className="text-sm text-gray-500 mt-1">Authentification activée</p>
                </CardContent>
              </Card>
            </div>

            {/* Notifications */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bell className="size-5 text-yellow-400" />
                  Préférences de notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div>
                      <div className="text-white mb-1">Nouvelles recommandations</div>
                      <p className="text-sm text-gray-400">Recevez des alertes pour les nouvelles annonces</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div>
                      <div className="text-white mb-1">Alertes de prix</div>
                      <p className="text-sm text-gray-400">Notifications lorsque le prix d&apos;une annonce baisse</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div>
                      <div className="text-white mb-1">Newsletter</div>
                      <p className="text-sm text-gray-400">Conseils et actualités automobile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
