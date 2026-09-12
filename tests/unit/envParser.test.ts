import { describe, it, expect } from 'vitest'
import { parseEnv, serializeEnv } from '../../src/main/services/envParser'

describe('envParser', () => {
  it('parses standard KEY=VALUE pairs', () => {
    const content = `
# Database credentials
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
`
    const { entries, lines } = parseEnv(content)

    expect(entries['DB_HOST']).toBe('127.0.0.1')
    expect(entries['DB_PORT']).toBe('5432')
    expect(entries['DB_USER']).toBe('postgres')
    expect(lines.some((l) => l.type === 'comment')).toBe(true)
  })

  it('handles export prefix', () => {
    const content = 'export API_KEY=secret_token_12345'
    const { entries } = parseEnv(content)
    expect(entries['API_KEY']).toBe('secret_token_12345')
  })

  it('handles single and double quoted values with spaces', () => {
    const content = `
APP_NAME="My Super App"
GREETING='Hello World!'
`
    const { entries } = parseEnv(content)
    expect(entries['APP_NAME']).toBe('My Super App')
    expect(entries['GREETING']).toBe('Hello World!')
  })

  it('handles multiline quoted values', () => {
    const content = `
CERTIFICATE="-----BEGIN CERTIFICATE-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
-----END CERTIFICATE-----"
ANOTHER_VAR=123
`
    const { entries } = parseEnv(content)
    expect(entries['CERTIFICATE']).toContain('-----BEGIN CERTIFICATE-----')
    expect(entries['CERTIFICATE']).toContain('-----END CERTIFICATE-----')
    expect(entries['ANOTHER_VAR']).toBe('123')
  })

  it('handles escaped newline characters in double quotes', () => {
    const content = 'MULTILINE="Line 1\\nLine 2"'
    const { entries } = parseEnv(content)
    expect(entries['MULTILINE']).toBe('Line 1\nLine 2')
  })

  it('handles inline comments on unquoted values', () => {
    const content = 'PORT=8080 # default application port'
    const { entries } = parseEnv(content)
    expect(entries['PORT']).toBe('8080')
  })

  it('serializes entries into valid .env format', () => {
    const input = {
      APP_URL: 'https://example.com',
      SPACED_VALUE: 'hello world',
      NORMAL: 'value'
    }
    const serialized = serializeEnv(input)
    expect(serialized).toContain('APP_URL=https://example.com')
    expect(serialized).toContain('SPACED_VALUE="hello world"')
    expect(serialized).toContain('NORMAL=value')
  })
})
