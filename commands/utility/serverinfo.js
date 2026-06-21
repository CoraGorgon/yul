const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('get server info'),

  run: async (client, interaction) => {
    try {
   
      await interaction.deferReply();

      const { guild } = interaction;
      
      // Obtenemos datos específicos
      const owner = await guild.fetchOwner();
      const iconURL = guild.iconURL({ size: 1024, dynamic: true });
      const bannerURL = guild.bannerURL({ size: 1024, dynamic: true });

      // Botones
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Invite")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/oauth2/authorize?client_id=1517975340549410816&permissions=281474980153408&integration_type=0&scope=bot`)
          .setEmoji("<:Shooting_Stars:935305026048495638>"),
        new ButtonBuilder()
          .setLabel("Support Server")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.gg/Ze5TEDCD`)
          .setEmoji("<:Kawaii_Moon_and_Stars:935305070852050965>")
      );

      // Embed
      const embed = new EmbedBuilder()
        .setColor('#303136')
        .setTitle(`Información de ${guild.name}`)
        .setThumbnail(iconURL)
        .addFields(
          { name: 'Dueño', value: `> ${owner.user.tag}`, inline: true },
          { name: 'Miembros', value: `> ${guild.memberCount}`, inline: true },
          { name: 'Canales', value: `> ${guild.channels.cache.size}`, inline: true },
          { name: 'Roles', value: `> ${guild.roles.cache.size}`, inline: true },
          { name: 'ID del Servidor', value: `> ${guild.id}`, inline: true },
          { name: 'Fecha de creación', value: `> <t:${Math.floor(guild.createdTimestamp / 1000)}:d>`, inline: true }
        )
        .setTimestamp();

      // Si el servidor tiene banner, lo añadimos
      if (bannerURL) {
        embed.setImage(bannerURL);
      }

      await interaction.editReply({ embeds: [embed], components: [row] });

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