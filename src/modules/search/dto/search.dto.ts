/**
 * DTO pour validation des requêtes de recherche
 */

import { z } from 'zod'

export const createSearchDto = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().max(100).optional(),
  maxPrice: z.number().int().positive().max(1000000),
  minPrice: z.number().int().nonnegative().optional(),
  fuelType: z.enum(['essence', 'diesel', 'hybrid', 'electric', 'any']).optional(),
  minYear: z.number().int().min(1900).max(2100).optional(),
  maxYear: z.number().int().min(1900).max(2100).optional(),
  maxMileage: z.number().int().nonnegative().optional(),
  gearbox: z.enum(['manual', 'automatic', 'any']).optional(),
  sellerType: z.enum(['professional', 'private', 'any']).optional(),
  zipCode: z.string().max(10).optional(),
  radiusKm: z.number().int().nonnegative().max(500).optional(),
  bodyType: z.string().optional(),
})

export type CreateSearchDto = z.infer<typeof createSearchDto>

