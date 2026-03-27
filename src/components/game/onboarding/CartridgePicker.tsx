"use client"

import { useEffect, useState } from "react"
import { fetchCartridges } from "@/lib/gameApi"
import CartridgeCard from "./CartridgeCard"
import type { Cartridge } from "@/types/game"

interface Props {
  onLoad: (cartridgeId: string) => void
}

export default function CartridgePicker({ onLoad }: Props) {
  const [cartridges, setCartridges] = useState<Cartridge[]>([])

  useEffect(() => {
    fetchCartridges().then(setCartridges).catch(() => {})
  }, [])

  if (cartridges.length === 0) return null

  return (
    <div className="mt-6 pt-6 border-t border-white/[0.04]">
      <h3 className="font-serif text-base text-[var(--text-secondary,#9a9690)] mb-3 text-center">
        or try a demo adventure
      </h3>
      <div className="flex flex-col gap-2.5">
        {cartridges.map((c) => (
          <CartridgeCard key={c.id} cartridge={c} onClick={() => onLoad(c.id)} />
        ))}
      </div>
    </div>
  )
}
