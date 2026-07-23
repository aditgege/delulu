import { describe, it, expect, beforeAll } from 'vitest'

const BASE = 'http://localhost:3000/api'

describe('master-data API', () => {
  // Test helper
  async function fetchApi(path: string, opts?: any) {
    return $fetch(`${BASE}${path}`, opts).catch(e => {
      if (e.response) return e.response
      throw e
    })
  }

  describe('menus', () => {
    it('GET /api/menus returns array', async () => {
      const res = await fetchApi('/menus')
      expect(Array.isArray(res)).toBe(true)
    })
  })

  describe('products', () => {
    it('GET /api/products returns array', async () => {
      const res = await fetchApi('/products')
      expect(Array.isArray(res)).toBe(true)
    })
  })

  describe('supplier-packs', () => {
    it('GET /api/supplier-packs returns array', async () => {
      const res = await fetchApi('/supplier-packs')
      expect(Array.isArray(res)).toBe(true)
    })
  })

  describe('supplier-mixes', () => {
    it('GET /api/mixes returns array', async () => {
      const res = await fetchApi('/mixes')
      expect(Array.isArray(res)).toBe(true)
    })
  })
})
