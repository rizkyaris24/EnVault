import { EnVaultApi } from './index'

declare global {
  interface Window {
    envaultApi: EnVaultApi
  }
}
