// Single source of truth for the five customer questions (used by the UI and API validation).
export const QUESTIONS = {
  service_type: { title: 'What would you like done?', options: [
    ['replacement', 'Replace existing driveway'], ['gravel_to_asphalt', 'Pave gravel driveway'],
    ['overlay', 'Resurface or overlay'], ['sealcoat', 'Sealcoat'],
    ['repair', 'Repair damaged areas'], ['unknown', 'Not sure']] },
  existing_surface: { title: 'What is the driveway made of now?', options: [
    ['asphalt', 'Asphalt'], ['gravel', 'Gravel'], ['concrete', 'Concrete'],
    ['dirt_grass', 'Dirt or grass'], ['combination', 'Combination'], ['not_sure', 'Not sure']] },
  driveway_condition: { title: 'How would you describe its condition?', options: [
    ['good', 'Good', 'Generally smooth or firm with only minor wear.'],
    ['fair', 'Fair', 'Some cracks, ruts, or minor uneven areas.'],
    ['poor', 'Poor', 'Potholes, major cracking, soft spots, or noticeably uneven areas.'],
    ['very_poor', 'Very poor', 'Crumbling, sinking, muddy, or widespread deterioration.'],
    ['not_sure', 'Not sure', 'I cannot confidently judge the condition.']] },
  property_issues: { title: 'Any issues we should know about?', hint: 'Select all that apply.', multi: true, options: [
    ['drainage', 'Drainage or standing water'], ['potholes', 'Potholes'], ['cracking', 'Significant cracking'],
    ['soft_areas', 'Sunken or soft areas'], ['oil', 'Oil or fuel stains'], ['access', 'Limited equipment access'],
    ['none', 'None'], ['not_sure', 'Not sure']] },
  project_footprint: { title: 'Are you keeping the same size and shape?', options: [
    ['same', 'Same size and shape'], ['widen', 'Widen'], ['extend', 'Extend'],
    ['add_parking', 'Add parking'], ['other', 'Other']] },
};
export const allowed = (q) => QUESTIONS[q].options.map((o) => o[0]);
