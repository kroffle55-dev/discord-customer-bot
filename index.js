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
              type: 2, // 버튼
              label: 'ℹ️ 문의하기',
              style: 2, // 회색 버튼
              custom_id: 'open_modal'
            }
          ]
        }
      ]
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  // 고객 버튼 클릭 시 모달 열기
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

  // 문의 모달 제출
  if (interaction.isModalSubmit() && interaction.customId === 'modal_support') {
    const subject = interaction.fields.getTextInputValue('subject');
    const content = interaction.fields.getTextInputValue('content');

    await interaction.reply({
      content: '✅ 문의가 정상적으로 접수되었습니다.',
      ephemeral: true
    });

    const logChannel = await client.channels.fetch('1425412015198965872');
    const embed = new EmbedBuilder()
      .setTitle('📥 새 문의 접수됨')
      .setDescription(`**${subject}**\n${content}\n\nby <@${interaction.user.id}>`)
      .setFooter({ text: '☁️ 클라우드벳 | 디스코드 겜블 커뮤니티' })
      .setColor(0x000000);

    await logChannel.send({
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 3, // 드롭다운
              custom_id: `admin_action_${interaction.user.id}`,
              placeholder: '답변 작업관리',
              options: [
                {
                  label: '✅️ 답변등록',
                  value: `reply_${interaction.user.id}`,
                  description: '문의 답변 등록하기'
                },
                {
                  label: '🔴 반려처리',
                  value: `delete_${interaction.user.id}`,
                  description: '문의 삭제처리 하기'
                }
              ]
            }
          ]
        }
      ]
    });
  }

  // 관리자 드롭다운 선택
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('admin_action_')) {
    const selected = interaction.values[0];
    const [action, userId] = selected.split('_');
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
                required: true
              }
            ]
          }
        ]
      });
    }

    if (action === 'delete') {
      await targetMessage.delete();

      await client.users.send(userId, {
        content: '**🔴 귀하께서 접수하신 문의사항이 반려 처리되었습니다, 감사합니다.**\n-# ☁️ 클라우드벳 커뮤니티 | 디스코드 겜블 커뮤니티'
      });
    }
  }

  // 답변 모달 제출
  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_reply_')) {
    const userId = interaction.customId.split('_')[2];
    const replyContent = interaction.fields.getTextInputValue('reply_content');

    // 🔥 관리자 채널의 원래 메시지 삭제
    try {
      const adminChannel = await client.channels.fetch('1425412015198965872');
      const originalMessage = await adminChannel.messages.fetch(interaction.message.id);
      await originalMessage.delete();
    } catch (err) {
      console.error('메시지 삭제 실패:', err);
    }

    await interaction.reply({
      content: '✅ 답변 등록됨.',
      ephemeral: true
    });

    await client.users.send(userId, {
      content: `**☁️ 귀하께서 접수하신 문의에 대한 답변이 등록되었습니다.**\n\n> ${replyContent}\n-# ☁️ 클라우드벳 커뮤니티 | 디스코드 겜블 커뮤니티`
    });
  }
});

client.login(process.env.TOKEN);