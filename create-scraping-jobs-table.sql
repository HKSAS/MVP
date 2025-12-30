-- Table pour tracker les jobs de scraping et permettre leur annulation
-- Permet d'arrêter automatiquement le scraping si l'utilisateur quitte la page

CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'cancelled', 'done', 'failed')),
  search_params JSONB NOT NULL, -- Paramètres de recherche (brand, model, maxPrice, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_user_id ON scraping_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at DESC);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_scraping_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scraping_jobs_updated_at
  BEFORE UPDATE ON scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_jobs_updated_at();

-- RLS (Row Level Security) - Les utilisateurs ne peuvent voir/modifier que leurs propres jobs
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- Policy : Les utilisateurs peuvent voir leurs propres jobs
CREATE POLICY "Users can view their own scraping jobs"
  ON scraping_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent créer leurs propres jobs
CREATE POLICY "Users can create their own scraping jobs"
  ON scraping_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent mettre à jour leurs propres jobs
CREATE POLICY "Users can update their own scraping jobs"
  ON scraping_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent supprimer leurs propres jobs
CREATE POLICY "Users can delete their own scraping jobs"
  ON scraping_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Commentaires pour documentation
COMMENT ON TABLE scraping_jobs IS 'Table pour tracker les jobs de scraping et permettre leur annulation';
COMMENT ON COLUMN scraping_jobs.status IS 'Statut du job: running, cancelled, done, failed';
COMMENT ON COLUMN scraping_jobs.search_params IS 'Paramètres de recherche au format JSONB';
COMMENT ON COLUMN scraping_jobs.cancelled_at IS 'Timestamp de l''annulation du job';
COMMENT ON COLUMN scraping_jobs.completed_at IS 'Timestamp de la complétion du job';

