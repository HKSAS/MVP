/**
 * Validation des inputs avec Zod
 */

import { z } from 'zod'

// Schema pour la recherche
export const searchSchema = z.object({
  brand: z.string().min(1, 'La marque est requise').max(50),
  model: z.string().min(1, 'Le modèle est requis').max(50),
  max_price: z.number().int().positive('Le prix maximum doit être positif'),
  fuelType: z.enum(['essence', 'diesel', 'hybride', 'electrique']).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(30),
})

// Schema pour l'analyse d'annonce
export const analyzeListingSchema = z.object({
  url: z.string().url('URL invalide').optional(),
  title: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  price_eur: z.number().positive().optional(),
  mileage_km: z.number().int().positive().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
}).refine(
  (data) => data.url || data.title,
  {
    message: 'Au moins une URL ou un titre doit être fourni',
  }
)

// Schema pour le contact
export const contactSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  email: z.string().email('Email invalide'),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères').max(2000),
})

// Type helpers
export type SearchInput = z.infer<typeof searchSchema>
export type AnalyzeListingInput = z.infer<typeof analyzeListingSchema>
export type ContactInput = z.infer<typeof contactSchema>

