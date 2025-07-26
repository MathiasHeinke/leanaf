import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, TrendingUp, Calendar, Settings } from "lucide-react"

import Profile from "@/pages/Profile"

const NewGoals = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Ziele & Einstellungen</h1>
        <p className="text-muted-foreground">Passen Sie Ihre Ziele und Präferenzen an</p>
      </div>

      {/* Goals Management */}
      <Card className="gradient-goals">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Zielkonfiguration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Profile onClose={() => {}} />
        </CardContent>
      </Card>
    </div>
  )
}

export default NewGoals