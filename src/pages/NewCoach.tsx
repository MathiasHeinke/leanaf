import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Users, History, Star } from "lucide-react"

import Coach from "@/components/Coach"

const NewCoach = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">AI Coach Center</h1>
        <p className="text-muted-foreground">Ihre persönlichen AI-Trainer für optimale Betreuung</p>
      </div>

      {/* Main Coach Interface */}

      <Card className="gradient-macros">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Coach Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Coach />
        </CardContent>
      </Card>
    </div>
  )
}

export default NewCoach