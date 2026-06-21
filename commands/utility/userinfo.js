const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { Profile } = require('discord-arts');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('get user info'),

  run: async (client, interaction) => {
    try {
     await interaction.deferReply();

      const targetUser = interaction.options.getUser('usuario') || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);
      const userData = await client.users.fetch(targetUser.id, { force: true });
      
   

      // Generación de la tarjeta con discord-arts
      const bufferImg = await Profile(targetUser.id, {
        presenceStatus: member.presence?.status || 'offline',
        badgesFrame: true,
        customDate: 'USER CARD',
        moreBackgroundBlur: true,
        backgroundBrightness: 100,
      });

      const attachment = new AttachmentBuilder(bufferImg, { name: 'profile.png' });

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
        .setTitle(`Información de ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'ID', value: `> ${targetUser.id}`, inline: true },
          { name: 'Creación', value: `> <t:${Math.floor(userData.createdAt / 1000)}:d>`, inline: true },
          { name: 'Roles', value: `> ${member.roles.cache.map(r => r).join(" ").replace("@everyone", " ")}` }
        )
        .setImage("attachment://profile.png")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
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