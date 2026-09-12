const supabase = require("../config/supabase");

const createSubscriber = async (email) => {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .insert([{ email }])
    .select()
    .single();

  if (error) throw error;

  return data;
};

module.exports = {
  createSubscriber,
};