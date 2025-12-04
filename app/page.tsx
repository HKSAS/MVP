'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Car } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'
import type { ListingResponse } from '@/lib/types'

// 1. Définition stricte des types
interface Listing {
  id: string
  external_id: string
  title: string
  price: number
  year: number
  mileage: number
  url: string
  image_url: string | null
  score_ia: number
  created_at: string
}

// Constante pour l'image de fallback (plus propre que de l'avoir dans le JSX)
const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%231f2937" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="18"%3EImage non disponible%3C/text%3E%3C/svg%3E'

export default function Home() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [listings, setListings] = useState<Listing[]>([]) // Historique Supabase (Flux Live)
  const [searchResults, setSearchResults] = useState<ListingResponse[]>([]) // Résultats de la recherche actuelle
  
  // Utiliser une ref pour stocker le channel et éviter les problèmes de cleanup
  const channelRef = useRef<any>(null)

  useEffect(() => {
    // 1. Chargement initial
    loadExistingListings()

    // 2. Configuration Realtime
    // On nettoie l'ancien channel s'il existe (sécurité React Strict Mode)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel('public:listings') // Nom de channel unique et clair
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listings',
        },
        (payload: RealtimePostgresInsertPayload<Listing>) => {
          // console.log('Realtime update:', payload.new)
          
          const newListing = payload.new as Listing
          
          setListings((prev) => {
            // Vérification anti-doublon robuste
            if (prev.some((l) => l.external_id === newListing.external_id)) {
              return prev
            }
            // Ajout au début de la liste (nouveaux en premier)
            return [newListing, ...prev]
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Connecté au flux temps réel')
        }
      })

    channelRef.current = channel

    // 3. Cleanup function (Essentiel !)
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  const loadExistingListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      if (data) setListings(data as Listing[])
    } catch (error) {
      console.error('Erreur chargement listings:', error)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation basique
    if (!brand.trim() || !model.trim() || !maxPrice) return

    setLoading(true)
    // Optionnel : On vide la liste pour montrer qu'on cherche de nouvelles choses
    // setListings([]) 

    try {
      const priceValue = parseInt(maxPrice) || 0 // Sécurisation du number

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.trim(),
          model: model.trim(),
          max_price: priceValue,
        }),
      })

      // Vérifier le Content-Type avant de parser
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Réponse invalide du serveur. Vérifiez que l'endpoint /api/search existe.`)
      }

      const data = await response.json()
      
      if (!response.ok) {
        // Construire un message d'erreur détaillé et lisible
        let errorMsg = data.error || data.message || 'Erreur inconnue lors de la recherche'
        
        // Ajouter le message utilisateur si disponible (plus clair que les détails techniques)
        if (data.message && data.message !== errorMsg) {
          errorMsg = `${errorMsg}\n\n${data.message}`
        } else if (data.details && !data.details.includes('http')) {
          // N'afficher les détails que s'ils ne contiennent pas d'URL HTTP (pour éviter la pollution)
          errorMsg += `\n\nDétails: ${data.details}`
        }
        
        throw new Error(errorMsg)
      }

      // Afficher directement les résultats de la recherche
      if (data.success && data.listings && Array.isArray(data.listings)) {
        setSearchResults(data.listings)
        console.log(`✅ ${data.listings.length} résultat(s) de recherche affiché(s)`)
      } else {
        setSearchResults([])
        console.warn('⚠️ Aucun résultat dans la réponse API')
      }
      
      // Le Realtime mettra à jour 'listings' (historique) en arrière-plan

    } catch (error: any) {
      console.error('Erreur recherche:', error)
      alert(`Erreur: ${error.message || 'Une erreur est survenue'}`)
    } finally {
      setLoading(false)
    }
  }

  // Helpers de formatage (sortis du JSX pour la lisibilité)
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)

  const formatMileage = (mileage: number) => 
    new Intl.NumberFormat('fr-FR').format(mileage) + ' km'

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500 shadow-green-500/50' // Ajout d'un petit shadow pour le style
    if (score >= 60) return 'bg-yellow-500 shadow-yellow-500/50'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Car className="h-6 w-6 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Conciergerie IA</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Formulaire */}
        <div className="mb-8 overflow-hidden rounded-xl border border-gray-800 bg-gray-950 p-1 shadow-xl">
          <form onSubmit={handleSearch} className="grid gap-2 bg-gray-900/50 p-5 md:grid-cols-4 lg:gap-4">
            <div>
              <label htmlFor="brand" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                Marque
              </label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Audi"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div>
              <label htmlFor="model" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                Modèle
              </label>
              <input
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: A3"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div>
              <label htmlFor="maxPrice" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                Budget Max
              </label>
              <input
                id="maxPrice"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Ex: 25000"
                min="0"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-blue-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Scan...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>Rechercher</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Section 1: Résultats de la recherche actuelle */}
        {searchResults.length > 0 && (
          <div className="mb-12">
            <div className="mb-6 flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Search className="h-5 w-5 text-blue-500" />
                Résultats de la recherche
                <span className="ml-2 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-400">
                  {searchResults.length}
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  formatPrice={formatPrice}
                  formatMileage={formatMileage}
                  getScoreColor={getScoreColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Flux Live (Historique Supabase) */}
        <div>
          <div className="mb-6 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              </span>
              Flux Live
              <span className="ml-2 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                {listings.length}
              </span>
            </h2>
          </div>

          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-950/50 py-20 text-center">
              <div className="rounded-full bg-gray-900 p-4">
                <Car className="h-10 w-10 text-gray-700" />
              </div>
              <p className="mt-4 font-medium text-gray-300">En attente de résultats</p>
              <p className="text-sm text-gray-500">Les voitures apparaîtront ici en temps réel</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.external_id}
                  listing={{
                    id: listing.external_id,
                    title: listing.title,
                    price_eur: listing.price,
                    mileage_km: listing.mileage,
                    year: listing.year,
                    source: 'unknown',
                    url: listing.url,
                    imageUrl: listing.image_url,
                    score_ia: listing.score_ia,
                    score_final: listing.score_ia, // Fallback si score_final n'existe pas
                  }}
                  formatPrice={formatPrice}
                  formatMileage={formatMileage}
                  getScoreColor={getScoreColor}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Composant réutilisable pour afficher une carte d'annonce
interface ListingCardProps {
  listing: ListingResponse
  formatPrice: (price: number) => string
  formatMileage: (mileage: number) => string
  getScoreColor: (score: number) => string
}

function ListingCard({ listing, formatPrice, formatMileage, getScoreColor }: ListingCardProps) {
  const score = listing.score_final ?? listing.score_ia ?? 0
  const price = listing.price_eur ?? 0
  const mileage = listing.mileage_km ?? 0
  const year = listing.year ?? 0

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-950 transition-all hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10"
    >
      {/* Image Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
        <img
          src={listing.imageUrl || FALLBACK_IMAGE}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE }}
        />
        
        {/* Badge Score */}
        <div className="absolute right-3 top-3 z-10">
          <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-sm ${getScoreColor(score)}`}>
            <span>Score</span>
            <span>{Math.round(score)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-3 line-clamp-2 text-lg font-bold text-white transition-colors group-hover:text-blue-400">
          {listing.title}
        </h3>
        
        <div className="mt-auto space-y-3">
          <div className="flex items-baseline justify-between border-b border-gray-800 pb-3">
            <span className="text-2xl font-bold text-blue-400">
              {price > 0 ? formatPrice(price) : 'Prix non disponible'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600"></span>
              {year > 0 ? year : 'N/A'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-600"></span>
              {mileage > 0 ? formatMileage(mileage) : 'N/A'}
            </div>
          </div>
          
          {listing.source && (
            <div className="text-xs text-gray-500">
              Source: {listing.source}
            </div>
          )}
        </div>
      </div>
    </a>
  )
}