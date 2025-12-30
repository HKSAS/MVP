/**
 * Validation des inputs avec Zod
 */

import { z } from 'zod'

// Schema pour la recherche (version avancée avec tous les filtres)
export const searchSchema = z.object({
  brand: z.string().min(1, 'La marque est requise').max(50),
  model: z.string().min(1, 'Le modèle est requis').max(50),
  max_price: z.number().int().positive('Le prix maximum doit être positif').optional(),
  year_min: z.number().int().min(1990).max(new Date().getFullYear()).optional(),
  year_max: z.number().int().min(1990).max(new Date().getFullYear()).optional(),
  mileage_max: z.number().int().positive().optional(),
  fuel_type: z.enum(['essence', 'diesel', 'hybride', 'electrique', 'gpl']).optional(),
  transmission: z.enum(['manuelle', 'automatique']).optional(),
  power_min: z.number().int().positive().optional(),
  // Critères "must have"
  critair: z.enum(['0', '1', '2', '3', '4', '5']).optional(),
  specific_requirements: z.string().max(500).optional(),
  has_rear_camera: z.boolean().optional(),
  has_carplay: z.boolean().optional(),
  // Localisation
  location: z.string().max(100).optional(),
  radius_km: z.number().int().positive().max(500).optional(),
  // Sources
  platforms: z.array(z.enum(['Leboncoin', 'LaCentrale', 'AutoScout24', 'ParuVendu', 'LeParking', 'ProCarLease'])).optional(),
  // Options
  hide_no_photo: z.boolean().optional(),
  hide_no_phone: z.boolean().optional(),
  // Tri
  sort_by: z.enum(['score', 'price-asc', 'price-desc', 'mileage', 'year']).optional().default('score'),
  // Pagination
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(30),
  // Compatibilité avec l'ancien format
  fuelType: z.enum(['essence', 'diesel', 'hybride', 'electrique']).optional(),
}).refine(
  (data) => {
    // Si year_min et year_max sont fournis, year_min <= year_max
    if (data.year_min && data.year_max) {
      return data.year_min <= data.year_max;
    }
    return true;
  },
  {
    message: "L'année minimum doit être inférieure ou égale à l'année maximum",
    path: ['year_min'],
  }
).transform((data) => {
  // Normaliser fuelType vers fuel_type pour compatibilité
  if (data.fuelType && !data.fuel_type) {
    return { ...data, fuel_type: data.fuelType };
  }
  return data;
})

// Schema pour l'analyse d'annonce
export const analyzeListingSchema = z.object({
  url: z.string().url('URL invalide').optional(),
  title: z.string().max(300).optional(),
  content: z.string().max(8000).optional(),
  description: z.string().max(8000).optional(), // Gardé pour compatibilité
  price: z.number().int().positive().optional(),
  price_eur: z.number().int().positive().optional(), // Gardé pour compatibilité
  mileage: z.number().int().positive().optional(),
  mileage_km: z.number().int().positive().optional(), // Gardé pour compatibilité
  year: z.number().int().min(1990).max(new Date().getFullYear()).optional(),
  fuel: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  source: z.string().optional(),
}).refine(
  (data) => data.url || data.content || data.title || data.description,
  {
    message: "Il faut au moins l'URL, le titre ou le texte de l'annonce pour analyser.",
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

