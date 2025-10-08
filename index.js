const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '.고객센터설치') {
    const embed = new EmbedBuilder()
      .setTitle('☁️ 클라우드벳 커뮤니티 고객센터')
      .setDescription('안녕하십니까, 클라우드벳 입니다.\n접수시 지원팀이 신속히 도와드리겠습니다.\n감사합니다.')
      .setFooter({ text: '☁️ 클라우드벳 | 디스코드 겜블 커뮤니티' })
      .setColor(0x000000);

    await message.channel.send({
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: '문의하기',
              style: 1,
              custom_id: 'open_modal'
            }
          ]
        }
      ]
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'open_modal') {
    await interaction.showModal({
      title: '문의 접수하기',
      custom_id: 'modal_support',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'subject',
              label: '제목',
              style: 1,
              required: true
            }
          ]
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'content',
              label: '내용',
              style: 2,
              required: true
            }
          ]
        }
      ]
    });
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_support') {
    const subject = interaction.fields.getTextInputValue('subject');
    const content = interaction.fields.getTextInputValue('content');

    await interaction.reply({
      content: '✅ __문의__가 정상적으로 __접수__되었습니다.',
      ephemeral: true
    });

    const logChannel = await client.channels.fetch('1425412015198965872');
    const embed = new EmbedBuilder()
      .setTitle('🔧 새 문의 접수됨')
      .addFields(
        { name: ' ', value: subject },
        { name: ' ', value: content },
        { name: 'by', value: `<@${interaction.user.id}>` }
      )
      .setFooter({ text: '☁️ 클라우드벳 | 디스코드 겜블 커뮤니티' })
      .setColor(0x000000);

    await logChannel.send({
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: '답변하기',
              style: 1,
              custom_id: `reply_${interaction.user.id}`
            },
            {
              type: 2,
              label: '삭제하기',
              style: 4,
              custom_id: `delete_${interaction.user.id}`
            }
          ]
        }
      ]
    });
  }

  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split('_');
    const targetMessage = await interaction.message.fetch();

    if (action === 'reply') {
      await interaction.showModal({
        title: '답변 작성',
        custom_id: `modal_reply_${userId}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'reply_content',
                label: '내용',
                style: 2,
                required: true // ✅ 최소 글자 제한 없음
              }
            ]
          }
        ]
      });
    }

    if (action === 'delete') {
      await targetMessage.delete();

      

      await client.users.send(userId, {
        content: '**🔴 귀하께서 접수하신 문의사항이 반려 처리되었습니다, 감사합니다.**\n-# ☁️ 클라우드벳 커뮤니티 | 디스코드 겜블 커뮤니티' // ✅ 유저에게 DM으로 전송되는 메시지
      });
    }
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_reply_')) {
    const userId = interaction.customId.split('_')[2];
    const replyContent = interaction.fields.getTextInputValue('reply_content');

    await interaction.reply({
      content: '✅ 답변 등록됨.',
      ephemeral: true
    });

    await client.users.send(userId, {
      content: `**☁️ 귀하께서 접수하신 문의 답변이 등록되었습니다.**\n${replyContent}\n-# ☁️ 클라우드벳 커뮤니티 | 디스코드 겜블 커뮤니티` // ✅ 유저에게 DM으로 전송되는 답변 메시지
    });
  }
});

client.login(process.env.TOKEN);
