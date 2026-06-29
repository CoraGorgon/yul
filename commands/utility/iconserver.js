const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('iconserver')
    .setDescription('They get the server icon'),

  run: async (client, interaction) => {
    try {
      
await safeDeferReply(interaction);

      // Obtenemos la URL del icono
      const iconURL = interaction.guild.iconURL({ size: 1024, dynamic: true });

      // Construimos los botones
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

      // Enviamos la respuesta
      await interaction.editReply({
        content: ` ㅤ\`✿﹑${interaction.guild.name}'s\` Icon Server`,
        files: [iconURL],
        components: [row]
      });
    } catch (e) {
      return handleCommandError(
        interaction,
        e,
        'Icon',
        `<a:3516scubbacat:1518088973845532862> \`|\` Hubo un error!! ${e}`
      );
    }
  },
};