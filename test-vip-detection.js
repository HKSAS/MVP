/**
 * Script de test pour vérifier la détection VIP
 * 
 * À exécuter dans la console du navigateur (F12) sur la page de l'application
 */

(async () => {
  console.log('🔍 Test de détection VIP...\n');
  
  try {
    // Importer les fonctions du projet
    const { getSupabaseBrowserClient } = await import('/lib/supabase/browser');
    const { canPerformAction } = await import('/lib/auth/access-control');
    const { checkUserAccess } = await import('/lib/auth/access-control');
    
    const supabase = getSupabaseBrowserClient();
    
    // 1. Vérifier l'utilisateur connecté
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Utilisateur non connecté:', userError);
      return;
    }
    
    console.log('✅ Utilisateur connecté:', user.email);
    console.log('   ID:', user.id);
    console.log('');
    
    // 2. Vérifier le profil dans la base de données
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, access_override, role, subscription_status, plan_type')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Erreur récupération profil:', profileError);
      return;
    }
    
    console.log('📊 Profil utilisateur:');
    console.log('   Email:', profile.email);
    console.log('   VIP (access_override):', profile.access_override);
    console.log('   Rôle:', profile.role);
    console.log('   Statut abonnement:', profile.subscription_status);
    console.log('   Plan:', profile.plan_type);
    console.log('');
    
    // 3. Tester can_perform_action directement via RPC
    console.log('🔧 Test 1: can_perform_action (RPC direct)');
    const { data: rpcData, error: rpcError } = await supabase.rpc('can_perform_action', {
      p_user_id: user.id,
      p_action_type: 'analyse'
    });
    
    if (rpcError) {
      console.error('❌ Erreur RPC:', rpcError);
    } else {
      console.log('   Résultat:', rpcData);
      console.log('   Can perform:', rpcData?.can_perform);
      console.log('   Reason:', rpcData?.reason);
      console.log('   Unlimited:', rpcData?.unlimited);
      console.log('');
    }
    
    // 4. Tester via la fonction TypeScript canPerformAction
    console.log('🔧 Test 2: canPerformAction (TypeScript)');
    const accessCheck = await canPerformAction('analyse');
    console.log('   Résultat:', accessCheck);
    console.log('   Can perform:', accessCheck.canPerform);
    console.log('   Reason:', accessCheck.reason);
    console.log('   Unlimited:', accessCheck.unlimited);
    console.log('');
    
    // 5. Tester check_user_access
    console.log('🔧 Test 3: check_user_access');
    const accessInfo = await checkUserAccess();
    console.log('   Résultat:', accessInfo);
    console.log('   Has access:', accessInfo.hasAccess);
    console.log('   Reason:', accessInfo.reason);
    console.log('   Is VIP:', accessInfo.isVip);
    console.log('   Is Admin:', accessInfo.isAdmin);
    console.log('   Unlimited:', accessInfo.unlimited);
    console.log('');
    
    // 6. Diagnostic
    console.log('📋 Diagnostic:');
    
    if (profile.access_override === true) {
      console.log('   ✅ VIP activé dans la base de données');
    } else {
      console.log('   ❌ VIP NON activé dans la base de données');
      console.log('   💡 Solution: Activez access_override = TRUE dans Retool');
    }
    
    if (rpcData?.reason === 'vip') {
      console.log('   ✅ VIP détecté par la fonction SQL');
    } else if (rpcData?.reason === 'quota_exceeded') {
      console.log('   ❌ Quota épuisé détecté (VIP non détecté)');
      console.log('   💡 Vérifiez que access_override = TRUE dans la base de données');
    } else {
      console.log('   ⚠️  Raison:', rpcData?.reason);
    }
    
    if (accessCheck.reason === 'vip') {
      console.log('   ✅ VIP détecté par la fonction TypeScript');
    } else {
      console.log('   ❌ VIP NON détecté par la fonction TypeScript');
    }
    
    console.log('');
    console.log('🎯 Conclusion:');
    
    if (profile.access_override === true && rpcData?.reason === 'vip') {
      console.log('   ✅ Tout fonctionne correctement !');
      console.log('   💡 Si le modal s\'affiche encore, rechargez la page (Ctrl+F5)');
    } else if (profile.access_override === true && rpcData?.reason !== 'vip') {
      console.log('   ❌ Problème: VIP activé mais non détecté par SQL');
      console.log('   💡 Solution: Ré-exécutez supabase-quota-system-update-CLEAN.sql');
    } else {
      console.log('   ❌ Problème: VIP non activé dans la base de données');
      console.log('   💡 Solution: Activez access_override = TRUE dans Retool');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
})();

