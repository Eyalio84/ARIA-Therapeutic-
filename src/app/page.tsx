import { TabBar } from "@/components/TabBar"
import { TabContainer } from "@/components/TabContainer"

export default function Home() {
  return (
    <div className="relative h-[100dvh] flex flex-col overflow-hidden" style={{ zIndex: 1 }}>
      <TabBar />
      <TabContainer />
    </div>
  )
}
