const supabase = require("../config/supabase");

const createWaitlistEntry = async (data) => {
  const { fullName, email, size } = data;

  const { data: waitlistEntry, error } = await supabase
    .from("clothing_waitlist")
    .insert([
      {
        name: fullName,
        email,
        size,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return waitlistEntry;
};

module.exports = {
  createWaitlistEntry,
};
