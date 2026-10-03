import { describe, expect, it } from 'vitest'
import { imageSignatureMatches, libraryTagComparisonKey, normalizeLibraryTagName, normalizeReferenceUrl, validateLibraryDraft } from '../src/services/libraryValidation'

describe('biblioteca de referências', () => {
  it('accepts HTTP and HTTPS references and defaults bare domains to HTTPS', () => {
    expect(normalizeReferenceUrl('exemplo.com/landing')).toBe('https://exemplo.com/landing')
    expect(normalizeReferenceUrl('http://exemplo.com')).toBe('http://exemplo.com/')
    expect(normalizeReferenceUrl('')).toBeNull()
    expect(() => normalizeReferenceUrl('javascript:alert(1)')).toThrow(/HTTP ou HTTPS/)
    expect(() => normalizeReferenceUrl('data:text/html,hello')).toThrow(/HTTP ou HTTPS/)
    expect(() => normalizeReferenceUrl('https://user:pass@example.com')).toThrow(/credenciais/)
  })

  it('validates the required fields and optional text limits', () => {
    expect(validateLibraryDraft({ title: ' ', type: 'site', url: '', description: '', notes: '' })).toContain('título')
    expect(validateLibraryDraft({ title: 'Referência', type: '', url: '', description: '', notes: '' })).toContain('tipo')
    expect(validateLibraryDraft({ title: 'Referência', type: 'site', url: 'javascript:alert(1)', description: '', notes: '' })).toContain('HTTP')
    expect(validateLibraryDraft({ title: 'Referência', type: 'site', url: '', description: '', notes: '' })).toBeNull()
  })

  it('checks image signatures against the declared MIME type', () => {
    expect(imageSignatureMatches(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true)
    expect(imageSignatureMatches(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true)
    expect(imageSignatureMatches(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]), 'image/webp')).toBe(true)
    expect(imageSignatureMatches(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/jpeg')).toBe(false)
  })

  it('strips hash markers while keeping similar tag spellings separate', () => {
    expect(normalizeLibraryTagName('  ##LandingPage  ')).toBe('LandingPage')
    expect(libraryTagComparisonKey('#CTA')).toBe(libraryTagComparisonKey(' cta '))
    expect(libraryTagComparisonKey('landingpage')).not.toBe(libraryTagComparisonKey('landing-page'))
  })
})
