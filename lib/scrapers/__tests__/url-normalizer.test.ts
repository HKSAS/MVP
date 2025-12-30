/**
 * Tests unitaires pour normalizeLeboncoinUrl()
 */

import { normalizeLeboncoinUrl } from '../url-normalizer'

describe('normalizeLeboncoinUrl', () => {
  it('devrait normaliser un ID numérique', () => {
    expect(normalizeLeboncoinUrl('3091711977')).toBe('https://www.leboncoin.fr/ad/3091711977')
  })

  it('devrait normaliser un path relatif /ad/ avec ID', () => {
    expect(normalizeLeboncoinUrl('/ad/3091711977')).toBe('https://www.leboncoin.fr/ad/3091711977')
  })

  it('devrait corriger un double /ad/ad/ dans un path relatif', () => {
    expect(normalizeLeboncoinUrl('/ad/ad/3091711977')).toBe('https://www.leboncoin.fr/ad/3091711977')
  })

  it('devrait corriger un double /ad/ad/ dans une URL complète avec query params', () => {
    const result = normalizeLeboncoinUrl('https://www.leboncoin.fr/ad/ad/3091711977?foo=bar&baz=qux')
    expect(result).toBe('https://www.leboncoin.fr/ad/3091711977')
  })

  it('devrait supprimer les query params et fragments', () => {
    expect(normalizeLeboncoinUrl('https://www.leboncoin.fr/ad/3091711977?foo=bar#section')).toBe(
      'https://www.leboncoin.fr/ad/3091711977'
    )
  })

  it('devrait gérer les URLs avec domaine alternatif', () => {
    expect(normalizeLeboncoinUrl('https://leboncoin.fr/ad/ad/3091711977')).toBe(
      'https://www.leboncoin.fr/ad/3091711977'
    )
  })

  it('devrait gérer les paths avec double /ad/ad/ multiple', () => {
    expect(normalizeLeboncoinUrl('/ad/ad/ad/3091711977')).toBe('https://www.leboncoin.fr/ad/3091711977')
  })

  it('devrait extraire l\'ID depuis une URL complexe avec double /ad/', () => {
    expect(normalizeLeboncoinUrl('https://www.leboncoin.fr/search/ad/ad/3091711977')).toBe(
      'https://www.leboncoin.fr/ad/3091711977'
    )
  })

  it('devrait gérer les paths sans /ad/ mais contenant /ad/ ailleurs', () => {
    const result = normalizeLeboncoinUrl('/search/ad/3091711977')
    expect(result).toBe('https://www.leboncoin.fr/ad/3091711977')
  })

  it('devrait retourner une URL valide même avec des caractères supplémentaires', () => {
    const result = normalizeLeboncoinUrl('/ad/3091711977/something')
    // Le normalizer devrait extraire l'ID et construire l'URL correcte
    expect(result).toMatch(/https:\/\/www\.leboncoin\.fr\/ad\/3091711977/)
  })

  it('devrait gérer les URLs avec suffixe /404 (cas réel du bug)', () => {
    expect(normalizeLeboncoinUrl('https://www.leboncoin.fr/ad/ad/3093409300/404')).toBe(
      'https://www.leboncoin.fr/ad/3093409300'
    )
  })

  it('devrait gérer les paths avec /ad/ad/ et suffixe /404', () => {
    expect(normalizeLeboncoinUrl('/ad/ad/3093409300/404')).toBe(
      'https://www.leboncoin.fr/ad/3093409300'
    )
  })
})

