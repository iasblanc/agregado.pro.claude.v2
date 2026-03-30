import type { Metadata } from 'next'
import { CalculadoraClient } from './CalculadoraClient'
export const metadata: Metadata = { title: 'Calculadora de Custo/km' }
export default function CalculadoraPage() { return <CalculadoraClient /> }
