const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('show privacy bot'),

  run: async (client, interaction) => {
    try {
      
const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Invite")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/oauth2/authorize?client_id=1517975340549410816&permissions=281474980153408&integration_type=0&scope=bot`)
                    .setEmoji("<:Shooting_Stars:935305026048495638>"),
                new ButtonBuilder()
                    .setLabel("Support Server")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.gg/j48GBxpXxE`)
                    .setEmoji("<:Kawaii_Moon_and_Stars:935305070852050965>")
            );

        const embed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('Yul // Privacy & Data Policy')
            .setDescription('At Yul, we are committed to protecting your privacy and ensuring transparency regarding data collection.')
            .addFields(
                { name: 'Data Collection', value: 'Yul only collects necessary data to function: Discord User IDs (to identify the DJ), Server IDs (to manage settings), and Voice Channel IDs (for playback).' },
                { name: 'Data Sharing', value: 'We do NOT sell, lease, or share your data with third parties. Your information is kept strictly within our database for the sole purpose of operating the bot.' },
                { name: 'Security', value: 'All sensitive credentials (like tokens) are stored in encrypted environments. We use standard industry security practices.' },
                { name: 'User Rights', value: 'You have the right to request full removal of your server data at any time. Just reach out via our support server.' }
            )
            .setFooter({ text: 'Yul © 2026 | Transparent & Secure' });

        await interaction.reply({ embeds: [embed], components: [row] });
    } catch (e) {
      return handleCommandError(
        interaction,
        e,
        'Error',
        `<a:3516scubbacat:1518088973845532862> \`|\` Hubo un error!! ${e}`
      );
    }
  },
};