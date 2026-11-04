/**
 * First-person wording for care plan field labels (admin display only).
 *
 * Keyed by the stored field label. The stored label is never changed: the API composes
 * and maps care plan fields by label text (see careflow-api label-mapped-compose.util.ts).
 * Follows the Initial Assessment wording (careflow-api ia-first-person-wording.ts): the service
 * user's own needs and information as "I…/My…", instructions to Care Professionals as "Please…".
 * Dates, review and risk-management fields and validated tool scores keep their stored wording.
 */
const CARE_PLAN_FIRST_PERSON_LABELS: Record<string, string> = {
  // Needs, goals, support and risk block (shared by most care plans)
  "What are the service user needs?": "What are my needs?",
  "What are the service user desired goals/outcomes?":
    "What are my desired goals and outcomes?",
  "Support required to achieve the desired goals/outcomes?":
    "What support do I need to achieve my goals and outcomes?",
  "Person-centred details": "Person-centred details about me",
  "Is there a risk associated with this area of care?":
    "Is there a risk associated with this area of my care?",

  // Advance
  "Capacity to participate":
    "Do I have capacity to take part in this discussion?",
  "Treatment escalation preferences": "My treatment escalation preferences",
  "Preferred place of care if deteriorating":
    "My preferred place of care if my health deteriorates",
  "Summary of expressed wishes": "Summary of my expressed wishes",
  "Details of Advance Decision To Refuse Treatment (including DNACPR)":
    "Details of my Advance Decision to Refuse Treatment (including DNACPR)",

  // Care Plan review form
  "Overall physical wellbeing": "My overall physical wellbeing",
  "Primary diagnoses and conditions": "My primary diagnoses and conditions",
  "Equipment in use": "Equipment I use",
  "Eating and drinking support": "My eating and drinking support",
  "Nutrition status and concerns": "My nutrition status and concerns",
  "Medication support level": "My medication support level",
  "Active medications summary": "Summary of my current medications",
  "Capacity and consent summary": "Summary of my capacity and consent",
  "Cognitive and emotional summary":
    "Summary of my cognitive and emotional wellbeing",
  "Environmental risks and access":
    "Risks and access considerations in my home",
  "Care plan still meeting needs": "Is my care plan still meeting my needs?",

  // Cognition and Behaviour / Dementia
  "Diagnosis or cognitive concern": "My diagnosis or cognitive concern",
  "Orientation – knows where they are": "Orientation – do I know where I am?",
  "Memory prompts used": "Memory prompts that help me",
  "Known triggers": "My known triggers",
  "Calming strategies that work": "Calming strategies that work for me",
  "Additional guidance for carers":
    "Additional guidance for Care Professionals supporting me",
  "Wandering or exit-seeking risk":
    "Is there a risk that I wander or try to leave my home unsafely?",
  "Life history and interests": "My life history and interests",
  "Stage of dementia (if known)": "Stage of my dementia (if known)",
  "Best time of day for activities": "The best time of day for my activities",
  "Orientation cues used (signs, photos, clocks)":
    "Orientation cues that help me (signs, photos, clocks)",
  "Sundowning or agitation – what helps":
    "Sundowning or agitation – what helps me",
  "What makes a good day for the person?": "What makes a good day for me?",
  "How does the person communicate best?": "How do I communicate best?",
  "Cognitive impairment level": "My cognitive impairment level",
  "Diagnosed dementia": "I have been diagnosed with dementia",
  "Memory and orientation summary": "Summary of my memory and orientation",
  "Daily routines": "My daily routines",
  "Meaningful activities and occupation":
    "Activities and occupation that are meaningful to me",
  "Night-time support": "The support I need at night",
  "Family and advocate involvement": "Involvement of my family and advocate",

  // Communication
  "Preferred language": "My preferred language",
  "Hearing impairment": "I have a hearing impairment",
  "Vision impairment": "I have a vision impairment",
  "Primary communication method": "My main way of communicating",
  "How to approach conversations":
    "Please approach conversations with me as follows",
  "Uses glasses/hearing aids": "The glasses or hearing aids I use",
  "Consent to share information with family":
    "I consent to my information being shared with my family",

  // Continence
  "Bladder continence": "My bladder continence",
  "Bowel continence": "My bowel continence",
  "Products used (pads, commode, etc.)": "Products I use (pads, commode, etc.)",
  "Toileting/prompting routine": "My toileting / prompting routine",
  "Fluid intake guidance": "Please support my fluid intake as follows",
  "Skin care after episodes":
    "Please care for my skin after episodes as follows",

  // Culture/Religion/Spirituality
  "Faith or belief system": "My faith or belief system",
  "Cultural practices important to the person":
    "Cultural practices that are important to me",
  "Religious observances or visits": "My religious observances or visits",
  "Dietary requirements linked to faith/culture":
    "My dietary requirements linked to my faith or culture",
  "Gender preference for personal care":
    "My preference for the gender of Care Professionals who support my personal care",
  "Notes for staff": "Notes for Care Professionals supporting me",

  // Eating and Drinking
  "Diet type": "My diet type",
  "Fluid target per day (ml)": "My fluid target per day (ml)",
  "Food allergies or intolerances": "My food allergies or intolerances",
  "Level of assistance": "Level of assistance I need",
  "Preferred foods and dislikes": "Foods I like and dislike",
  "Choking risk / SALT recommendations":
    "My choking risk and speech and language therapist (SALT) recommendations",

  // Falls
  "Falls in last 12 months":
    "Number of times I have fallen in the last 12 months",
  "Last fall date and circumstances": "Date and circumstances of my last fall",
  "Injury from previous falls": "I have been injured in previous falls",
  "Mobility aids in use": "Mobility aids I use",
  "Environmental hazards identified": "Hazards identified in my home",
  "Transfers – instructions": "Please support my transfers as follows",

  // Final Days
  "Current focus of care": "Current focus of my care",
  "Mouth care frequency": "How often I need mouth care",
  "Pain management plan": "My pain management plan",
  "Family contact and updates": "Contact and updates for my family",
  "Spiritual or cultural needs": "My spiritual or cultural needs",
  "Preferred place of death if expressed":
    "My preferred place of death (if I have expressed one)",

  // Home Care Plan
  "Summary of needs prompting care":
    "Summary of my needs that led to this care",
  "What are the Client's Desired Goals and Outcomes?":
    "What are my desired goals and outcomes?",
  "Detailed Goals and Outcomes": "My goals and outcomes in detail",
  "Risks if care not provided": "Risks to me if care is not provided",
  "Does the Client have Cognitive Impairment?":
    "Do I have a cognitive impairment?",
  "What are the Client's Personal Care Needs?":
    "What are my personal care needs?",
  "Has the Client Consented to Personal Care Support?":
    "I give my consent for personal care support",
  "Client's Personal Needs Summary": "Summary of my personal care needs",
  "Does the Client have Continence Care Needs?":
    "Do I have continence care needs?",
  "Has the Client Consented to Continence Care Support?":
    "I give my consent for continence care support",
  "Client's Continence Needs Summary": "Summary of my continence needs",
  "What are the Client's Mobility Care Needs?":
    "What are my mobility care needs?",
  "Has the Client Consented to Mobility Support?":
    "I give my consent for mobility support",
  "Client's Mobility Summary": "Summary of my mobility",
  "Client's use of Aids for Mobility Summary":
    "Summary of the mobility aids I use",
  "What are the Client's Meal Requirements?": "What are my meal requirements?",
  "Has the Client Consented to Meal Support?":
    "I give my consent for meal support",
  "Client's Meal Requirements Summary": "Summary of my meal requirements",
  "Client's Dietary Needs Summary": "Summary of my dietary needs",
  "What are the Client's Medication Support Requirements?":
    "What medication support do I need?",
  "Has the Client Consented to Medication Support?":
    "I give my consent for medication support",
  "Client's Medication Summary": "Summary of my medication",
  "What are the Client's Support Requirements?": "What support do I need?",
  "Household Support Summary": "Summary of the household support I need",
  "Other Support Needs Summary": "Summary of other support I need",
  "Other Support Requirements": "Other support I need",
  "Has the Client Consented to this Support?":
    "I give my consent for this support",
  "Client Advance Support Requirements?":
    "What are my advance support requirements?",
  "Has the Client Consented to Advance Support?":
    "I give my consent for advance support",
  "Client Final Day Requirements?": "What are my final days requirements?",
  "Has the Client Consented to the Final Days Plan?":
    "I give my consent for the final days plan",

  // Home Care Plan - needs/goals/support / Person Centred care plan
  "Personal care needs": "My personal care needs",
  "Domestic and living skills": "My domestic and living skills",
  "Social and emotional needs": "My social and emotional needs",
  "Goal 1 – what we will achieve": "Goal 1 – what I want to achieve",
  "How carers will support this":
    "How Care Professionals will support me with this",
  "Goal 2 (optional)": "Goal 2 – what I want to achieve (optional)",
  "Morning routine preferences": "My morning routine preferences",
  "Evening / bedtime routine": "My evening / bedtime routine",
  "Eating / drinking needs": "My eating and drinking needs",
  "How is consent gained?": "How is my consent gained?",

  // Home Support Plan
  "Summary of home support needs": "Summary of my home support needs",
  "Personal care tasks": "Personal care tasks I need help with",
  "Personal care assistance level": "Level of personal care assistance I need",
  "Toileting & continence support": "My toileting and continence support",
  "Preferred personal care times": "My preferred personal care times",
  "Dignity & privacy preferences": "My dignity and privacy preferences",
  "Meal preparation support": "Meal preparation support I need",
  "Eating & drinking assistance level":
    "Level of eating and drinking assistance I need",
  "Dietary preferences & restrictions":
    "My dietary preferences and restrictions",
  "Cleaning tasks": "Cleaning tasks I need help with",
  "Laundry tasks": "Laundry tasks I need help with",
  "Other household tasks": "Other household tasks I need help with",
  "Domestic assistance level": "Level of domestic assistance I need",
  "Shopping & errands": "Shopping and errands I need help with",
  "Finance / bill support required": "I need support with finances or bills",
  "Finance support details": "Details of the finance support I need",
  "Social & community activities": "My social and community activities",
  "Support to attend activities": "Support I need to attend activities",
  "Home access instructions": "Please access my home as follows",
  "Key safe in use": "I have a key safe",
  "Key safe / entry code notes": "My key safe and entry code notes",
  "Environmental hazards / home safety notes":
    "Hazards and safety notes for my home",
  "Equipment maintenance / contact":
    "Who maintains my equipment, and their contact details",
  "No-response procedure": "Please follow this procedure if I do not respond",
  "When to escalate (office / GP / 999)":
    "When to escalate concerns about me (office / GP / 999)",
  "Telecare / pendant alarm in use": "I use a telecare / pendant alarm",
  "Can answer front door independently":
    "I can answer the front door on my own",
  "Lives alone": "I live alone",
  "Equipment & aids in the home": "Equipment and aids in my home",
  "Hoist / sling in use": "I use a hoist / sling",
  "Informal carer involved":
    "I receive support from an unpaid (informal) carer",
  "Informal carer name & contact":
    "My unpaid (informal) carer's name and contact details",
  "Other care agencies involved": "Other care agencies involved in my care",
  "GP / pharmacy / other professionals":
    "My GP, pharmacy and other professionals",
  "Risks if support not provided": "Risks to me if support is not provided",

  // Infection
  "Active infection or colonisation":
    "I have an active infection or colonisation",
  "Isolation or enhanced precautions":
    "Isolation or enhanced precautions I need",
  "PPE required for visits": "Please wear this PPE when supporting me",
  "Hand hygiene and cleaning notes":
    "Please follow these hygiene and cleaning instructions when supporting me",
  "When to escalate to nurse/GP":
    "When to escalate concerns about me to a nurse or GP",

  // Medication
  "Known allergies": "My known allergies",
  "Storage and blister packs":
    "How my medicines are stored (including blister packs)",
  "Refusal or missed dose – action":
    "Please do this if I refuse or miss a dose",
  "PRN medicines and when used":
    "My PRN (as required) medicines and when I use them",
  "Pharmacy and GP contact": "My pharmacy and GP contact details",

  // Mobility
  "Indoor mobility": "My indoor mobility",
  "Outdoor mobility": "My outdoor mobility",
  "Equipment issued": "Equipment issued to me",
  "Transfer method (bed/chair/toilet)": "How I transfer (bed / chair / toilet)",
  "Number of carers required": "Number of Care Professionals I need",
  "Physio / OT recommendations": "Physio / OT recommendations for me",
  "Is there a procedure in case of an emergency?":
    "Is there a procedure to support me in an emergency?",

  // Pain Management
  "Usual pain score (0–10)":
    "How bad my pain usually is, from 0 (none) to 10 (worst)",
  "Site and character of pain": "Where my pain is and what it feels like",
  "What worsens or relieves pain": "What makes my pain worse or better",
  "Regular analgesia": "My regular pain relief (analgesia)",
  "Non-pharmacological methods": "Non-medication methods that help my pain",
  "When to call GP or out of hours":
    "When to call my GP or out of hours for me",

  // Personal Safety
  "Home hazards identified": "Hazards identified in my home",
  "Smoking / fire safety": "Smoking and fire safety in my home",
  "Emergency contacts": "My emergency contacts",

  // Physical Health
  "Primary diagnoses": "My primary diagnoses",
  "Recent hospital admissions": "My recent hospital admissions",
  "GP surgery and named GP": "My GP surgery and named GP",
  "Blood glucose monitoring": "I need blood glucose monitoring",
  "When to seek urgent medical advice":
    "When to seek urgent medical advice for me",

  // Pressure Ulcer / Skin Integrity
  "Existing pressure areas or wounds": "My existing pressure areas or wounds",
  "Repositioning schedule": "My repositioning schedule",
  "Pressure relieving equipment": "My pressure relieving equipment",
  "Skin inspection frequency": "How often my skin should be checked",
  "Skin type / common issues": "My skin type and common issues",
  "Emollients or creams prescribed": "Emollients or creams prescribed for me",
  "Previous pressure damage": "I have had pressure damage before",
  "Application of creams – when and where":
    "When and where my creams are applied",
  "Signs to report immediately": "Please report these signs immediately",

  // Psychological
  "Current mood (typical)": "My typical mood",
  "Mental health diagnosis": "My mental health diagnosis",
  "Triggers for distress": "Things that cause me distress",
  "Coping strategies that help": "Coping strategies that help me",
  "Involvement of CMHT or counsellor":
    "My involvement with CMHT or a counsellor",
  "When to contact crisis team / GP":
    "When to contact the crisis team or my GP for me",

  // Sleeping and Night
  "Usual bedtime and wake time": "My usual bedtime and wake time",
  "Night-time waking or confusion": "My night-time waking or confusion",
  "Daytime naps": "I nap during the day",
  "Evening routine": "My evening routine",
  "Call bell / monitoring": "My call bell / monitoring",
  "Night-time drinks or snacks": "My night-time drinks or snacks",

  // Social Activities
  "Hobbies and pastimes": "My hobbies and pastimes",
  "Faith or community groups": "My faith or community groups",
  "Preferred activities in service": "My preferred activities",
  "Support needed to attend activities": "Support I need to attend activities",
  "Family or friends involved": "Family or friends involved in my life",
  "Transport or access notes": "My transport or access notes",

  // Washing and dressing
  "Preferred wash type": "My preferred wash type",
  "Preferred time of day": "My preferred time of day",
  "Gender of carer preferred":
    "My preference for the gender of Care Professionals who support me",
  "Level of assistance required": "Level of assistance I need",
  "Clothing preferences": "My clothing preferences",
  "Dental / denture care": "My dental / denture care",
};

/** On-screen label for a care plan field: first-person wording when one is set, else the stored label. */
export function carePlanFieldLabel(label: string): string {
  return CARE_PLAN_FIRST_PERSON_LABELS[label.trim()] ?? label;
}
