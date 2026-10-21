import { ArrowRight } from 'lucide-react'

export function StackStrip() {
  return (
    <div className="experience-strip container">
      <div className="stack-list">
        React <i /> TypeScript <i /> Node.js <i /> Ruby <i /> AWS <i />
        <span className="ai-python">
          AI <ArrowRight size={13} aria-hidden="true" /> Python & CAN
        </span>
      </div>
    </div>
  )
}
