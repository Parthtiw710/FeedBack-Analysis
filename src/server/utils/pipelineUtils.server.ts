
export function normalise(payload: any): any {
  const clean: any = {}
  for (const [k, v] of Object.entries(payload)) {
    if (k.startsWith('_') || v === undefined || v === null) continue
    if (Array.isArray(v)) {
      const filtered = v.filter(x => x !== null && x !== undefined && x !== '')
      if (filtered.length > 0) clean[k] = filtered
    } else if (typeof v === 'string') {
      const t = v.trim()
      if (!t) continue
      clean[k] = t !== '' && !isNaN(t as any) && t !== '' ? Number(t) : t
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      clean[k] = v
    } else {
      clean[k] = v
    }
  }
  return clean
}

export function deriveSentiment(formType: string, clean: any, map: any): string | null {
  const primary = map.scorePrimary ? clean[map.scorePrimary] : undefined

  if (primary === undefined || primary === null) {
    if (formType === 'churnSurvey') return 'negative'
    if (formType === 'winLoss') {
      const outcome = clean.outcome
      if (outcome === 'won')         return 'positive'
      if (outcome === 'lost')        return 'negative'
      if (outcome === 'no_decision') return 'neutral'
      return 'neutral'
    }
    if (formType === 'featureRequest') {
      const urgency = clean[map.subCategory]
      if (urgency === 'blocking') return 'negative'
      if (urgency === 'nice_to_have') return 'neutral'
      return 'neutral'
    }
    if (formType === 'pricingFeedback') {
      const v = clean.value_perception
      if (v === 'exceptional' || v === 'good') return 'positive'
      if (v === 'acceptable')                   return 'neutral'
      if (v === 'poor')                         return 'negative'
      return null
    }
    if (formType === 'betaFeedback') {
      const bugs = clean.bugs_found
      if (bugs === 'blocker')  return 'negative'
      if (bugs === 'bug')      return 'neutral'
      return null
    }
    if (formType === 'developerExperience') {
      const pain = clean.biggest_dx_pain
      if (pain === 'none') return 'positive'
      return null
    }
    return null
  }

  if (map.scorePrimary && primary <= 5) {
    if (primary >= 4)   return 'positive'
    if (primary === 3)  return 'neutral'
    return 'negative'
  }
  if (formType === 'nps') {
    if (primary >= 9)  return 'positive'
    if (primary >= 7)  return 'neutral'
    return 'negative'
  }
  if (formType === 'ces') {
    if (primary >= 6)  return 'positive'
    if (primary >= 4)  return 'neutral'
    return 'negative'
  }
  return null
}

export function deriveNpsSegment(score: number | null | undefined): string | null {
  if (score === undefined || score === null) return null
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

export function derivePriority(formType: string, clean: any, map: any, sentimentLabel: string | null): string | null {
  if (map.priority && clean[map.priority]) return clean[map.priority]

  if (formType === 'featureRequest') {
    const u = clean.urgency
    if (u === 'blocking')    return 'high'
    if (u === 'high_value')  return 'medium'
    return 'low'
  }
  if (formType === 'betaFeedback') {
    if (clean.bugs_found === 'blocker') return 'critical'
    if (clean.bugs_found === 'bug')     return 'high'
    if (clean.bugs_found === 'minor')   return 'low'
    return 'low'
  }
  if (formType === 'winLoss') {
    if (clean.outcome === 'lost')        return 'high'
    if (clean.outcome === 'no_decision') return 'medium'
    return 'low'
  }
  if (formType === 'pricingFeedback') {
    if (clean.value_perception === 'poor')       return 'high'
    if (clean.value_perception === 'acceptable') return 'medium'
    return 'low'
  }
  if (formType === 'developerExperience') {
    if (['rate_limits','no_sandbox','webhook_issues'].includes(clean.biggest_dx_pain)) return 'high'
    if (clean.biggest_dx_pain && clean.biggest_dx_pain !== 'none') return 'medium'
    return 'low'
  }

  if (sentimentLabel === 'negative') return 'high'
  if (sentimentLabel === 'neutral')  return 'medium'
  if (sentimentLabel === 'positive') return 'low'
  return null
}

export function computeDerived(formType: string, clean: any, map: any, sentimentLabel: string | null): any {
  const derived: any = {}

  const allText = (map.freetext || [])
    .map((f: string) => clean[f] || '')
    .join(' ')
    .trim()
  derived.freetext_word_count = allText ? allText.split(/\s+/).length : 0
  derived.has_freetext = derived.freetext_word_count > 0

  if (formType === 'ces' && clean.effort !== undefined) {
    if (clean.effort >= 6)      derived.effort_band = 'low_effort'
    else if (clean.effort >= 4) derived.effort_band = 'medium_effort'
    else                        derived.effort_band = 'high_effort'
  }

  if (formType === 'nps' && clean.score !== undefined) {
    derived.nps_class = deriveNpsSegment(clean.score)
  }

  derived.churn_risk = false
  if (formType === 'churnSurvey') {
    derived.churn_risk = true
  } else if (sentimentLabel === 'negative') {
    derived.churn_risk = true
  } else if (formType === 'nps' && clean.score !== undefined && clean.score <= 3) {
    derived.churn_risk = true
  }

  derived.needs_escalation = false
  if (['critical', 'high'].includes(clean.priority || clean.severity)) {
    derived.needs_escalation = true
  } else if (formType === 'nps' && clean.score !== undefined && clean.score <= 2) {
    derived.needs_escalation = true
  } else if (formType === 'csat' && clean.satisfaction !== undefined && clean.satisfaction === 1) {
    derived.needs_escalation = true
  }

  if (formType === 'featureRequest') {
    derived.is_blocking_request = clean.urgency === 'blocking'
  }

  if (formType === 'winLoss') {
    derived.is_loss         = clean.outcome === 'lost'
    derived.is_win          = clean.outcome === 'won'
    derived.lost_to_price   = clean.primary_reason === 'price'
    derived.lost_to_feature = clean.primary_reason === 'features'
    derived.has_competitor  = !!(clean.competitor_chosen && clean.competitor_chosen.length > 1)
  }

  if (formType === 'betaFeedback') {
    derived.has_blocker_bug    = clean.bugs_found === 'blocker'
    derived.has_bug            = ['bug', 'blocker'].includes(clean.bugs_found)
    derived.unmet_expectations = clean.met_expectations === 'unmet'
    derived.ready_for_ga       = !derived.has_blocker_bug && clean.met_expectations !== 'unmet'
    if (clean.bugs_found === 'blocker') derived._priority_override = 'critical'
    else if (clean.bugs_found === 'bug') derived._priority_override = 'high'
    else if (clean.bugs_found === 'minor') derived._priority_override = 'low'
  }

  if (formType === 'developerExperience') {
    derived.dx_friction_level =
      clean.biggest_dx_pain === 'none'       ? 'none'   :
      ['bad_docs','missing_sdk'].includes(clean.biggest_dx_pain) ? 'medium' : 'high'
    derived.needs_sdk  = clean.biggest_dx_pain === 'missing_sdk'
    derived.docs_issue = ['bad_docs','poor_errors'].includes(clean.biggest_dx_pain)
  }

  if (formType === 'pricingFeedback') {
    derived.feels_overcharged = clean.value_perception === 'poor'
    derived.upgrade_blocked   = !!(clean.upgrade_blocker && clean.upgrade_blocker !== 'na' && clean.upgrade_blocker !== 'sufficient')
    const tooExp = Number(clean.too_expensive_at)
    const great  = Number(clean.great_value_at)
    if (!isNaN(tooExp) && tooExp > 0) derived.too_expensive_at_num = tooExp
    if (!isNaN(great)  && great > 0)  derived.great_value_at_num   = great
  }

  if (formType === 'onboardingFeedback') {
    derived.onboarding_at_risk =
      (clean.time_to_value === 'not_yet' || clean.time_to_value === 'no_action') &&
      (clean.setup_blocker !== 'none' && clean.setup_blocker !== undefined)
  }

  return derived
}

