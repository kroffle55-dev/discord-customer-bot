const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

// 채널 ID 설정
const GENERAL_INQUIRY_LOG_CHANNEL_ID = '1428277669409067120'; // 일반 문의 로그 채널
const PRODUCT_PURCHASE_LOG_CHANNEL_ID = '1428345973993898054'; // 상품 구매 로그 채널

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '.고객센터설치') {
    const embed = new EmbedBuilder()
      .setTitle('⚡️에이피 고객센터')
      .setDescription('안녕하십니까, 에이피 입니다.\n접수시 지원팀이 신속히 도와드리겠습니다.\n감사합니다.')
      .setFooter({ text: '⚡️AP | 에이피 베이프' })
      .setColor(0x000000);

    const row = new ActionRowBuilder()
        .addComponents(
            {
              type: 2, // 버튼
              label: 'ℹ️ 문의하기',
              style: 2, // 회색 버튼
              custom_id: 'open_inquiry_selector'
            }
        );

    await message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
    // 문의하기 버튼 클릭 -> 문의 유형 선택 드롭다운 표시
    if (interaction.isButton() && interaction.customId === 'open_inquiry_selector') {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_inquiry_type')
            .setPlaceholder('문의 유형을 선택하세요.')
            .addOptions([
                {
                    label: '🛒 상품구매',
                    description: '상품 구매를 위한 주문서를 작성합니다.',
                    value: 'product_purchase',
                },
                {
                    label: '💬 일반문의',
                    description: '서비스 관련 일반 문의를 작성합니다.',
                    value: 'general_inquiry',
                },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '원하시는 문의 유형을 선택해주세요.',
            components: [row],
            ephemeral: true,
        });
    }

    // 문의 유형 드롭다운 선택
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_inquiry_type') {
        const selectedType = interaction.values[0];

        if (selectedType === 'general_inquiry') {
            const modal = new ModalBuilder()
                .setCustomId('modal_support')
                .setTitle('일반 문의 접수하기');

            const subjectInput = new TextInputBuilder()
                .setCustomId('subject')
                .setLabel("제목")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const contentInput = new TextInputBuilder()
                .setCustomId('content')
                .setLabel("내용")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(subjectInput), new ActionRowBuilder().addComponents(contentInput));
            await interaction.showModal(modal);
        } else if (selectedType === 'product_purchase') {
            const modal = new ModalBuilder()
                .setCustomId('modal_purchase')
                .setTitle('상품 구매 접수하기');
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_product_type').setLabel("상품종류").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_name').setLabel("성함").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_phone').setLabel("전화번호").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_product_name').setLabel("상품명").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_address').setLabel("배송주소").setStyle(TextInputStyle.Paragraph).setRequired(true)),
            );
            await interaction.showModal(modal);
        }
    }
  
    // 일반 문의 모달 제출
    if (interaction.isModalSubmit() && interaction.customId === 'modal_support') {
      const subject = interaction.fields.getTextInputValue('subject');
      const content = interaction.fields.getTextInputValue('content');
  
      await interaction.reply({
        content: '✅ 문의가 정상적으로 접수되었습니다.',
        ephemeral: true
      });
  
      const logChannel = await client.channels.fetch(GENERAL_INQUIRY_LOG_CHANNEL_ID);
      const embed = new EmbedBuilder()
        .setTitle('📥 새 문의 접수됨')
        .setDescription(`**${subject}**\n${content}\n\nby <@${interaction.user.id}>`)
        .setFooter({ text: '⚡️AP | 에이피 베이프' })
        .setColor(0x000000);
  
      const adminRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`admin_action_general_${interaction.user.id}`)
            .setPlaceholder('답변 작업관리')
            .addOptions([
                { label: '✅️ 답변등록', value: `reply_${interaction.user.id}`, description: '문의 답변 등록하기' },
                { label: '🔴 반려처리', value: `delete_${interaction.user.id}`, description: '문의 삭제처리 하기' }
            ])
      );

      await logChannel.send({ embeds: [embed], components: [adminRow] });
    }

    // 상품 구매 모달 제출
    if (interaction.isModalSubmit() && interaction.customId === 'modal_purchase') {
        const productType = interaction.fields.getTextInputValue('purchase_product_type');
        const name = interaction.fields.getTextInputValue('purchase_name');
        const phone = interaction.fields.getTextInputValue('purchase_phone');
        const productName = interaction.fields.getTextInputValue('purchase_product_name');
        const address = interaction.fields.getTextInputValue('purchase_address');
        
        await interaction.reply({ content: '✅ 상품 구매 요청이 정상적으로 접수되었습니다.', ephemeral: true });
        
        try {
            await client.users.send(interaction.user.id, { content: '계좌번호 전송' });
        } catch (error) {
            console.error(`Could not send DM to ${interaction.user.tag}.`, error);
            interaction.followUp({ content: 'DM을 보낼 수 없어 계좌번호를 전송하지 못했습니다. 봇 DM을 허용해주세요!', ephemeral: true });
        }

        const logChannel = await client.channels.fetch(PRODUCT_PURCHASE_LOG_CHANNEL_ID);
        const embed = new EmbedBuilder()
            .setTitle('🛒 상품구매 리퀘스트가 제출되었습니다')
            .addFields(
                { name: '신청자', value: `<@${interaction.user.id}>`, inline: false },
                { name: '상품종류', value: productType, inline: true },
                { name: '성함', value: name, inline: true },
                { name: '전화번호', value: phone, inline: true },
                { name: '상품명', value: productName, inline: false },
                { name: '배송주소', value: address, inline: false },
            )
            .setColor(0x5865F2)
            .setFooter({ text: '⚡️AP | 에이피 베이프' });
        
        const purchaseAdminRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`admin_action_purchase_${interaction.user.id}`)
                .setPlaceholder('주문 작업관리')
                .addOptions([
                    { label: '✅ 접수완료', value: `confirm_${interaction.user.id}`, description: '주문 접수를 완료하고 유저에게 알립니다.' },
                    { label: '❌ 주문취소', value: `cancel_${interaction.user.id}`, description: '주문을 취소하고 유저에게 알립니다.' }
                ])
        );

        // 유저가 입력한 정보를 JSON 형태로 저장하여 나중에 DM 보낼 때 사용
        const purchaseData = JSON.stringify({ productType, name, phone, productName, address });
        embed.setDescription(`\`\`\`json\n${purchaseData}\n\`\`\``); // 임베드에 숨겨진 데이터로 저장

        await logChannel.send({ embeds: [embed], components: [purchaseAdminRow] });
    }
  
    // 일반문의 관리자 드롭다운 선택
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('admin_action_general_')) {
      const selected = interaction.values[0];
      const [action, userId] = selected.split('_');
      
      if (action === 'reply') {
        const modal = new ModalBuilder()
            .setCustomId(`modal_reply_${userId}`)
            .setTitle('답변 작성');
        const replyInput = new TextInputBuilder()
            .setCustomId('reply_content')
            .setLabel("내용")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(replyInput));
        await interaction.showModal(modal);
      }
  
      if (action === 'delete') {
        await interaction.message.delete();
        await interaction.reply({ content: '해당 문의를 반려처리했습니다.', ephemeral: true });
        await client.users.send(userId, {
          content: '**🔴 귀하께서 접수하신 문의사항이 반려 처리되었습니다, 감사합니다.**\n-# ⚡️AP | 에이피 베이프'
        });
      }
    }

    // 상품구매 관리자 드롭다운 선택
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('admin_action_purchase_')) {
        const selected = interaction.values[0];
        const [action, userId] = selected.split('_');
        const originalEmbed = interaction.message.embeds[0];

        // 임베드에 숨겨둔 주문정보 JSON 파싱
        const purchaseData = JSON.parse(originalEmbed.description.replace(/```json\n|\n```/g, ''));

        if (action === 'confirm') {
            await interaction.message.delete();
            await interaction.reply({ content: '해당 주문을 접수완료 처리했습니다.', ephemeral: true });
            
            const dmContent = `**✅ 상품 접수가 완료되었습니다.**\n\n` +
                              `**상품종류:** ${purchaseData.productType}\n` +
                              `**성함:** ${purchaseData.name}\n` +
                              `**전화번호:** ${purchaseData.phone}\n` +
                              `**상품명:** ${purchaseData.productName}\n` +
                              `**배송주소:** ${purchaseData.address}`;

            await client.users.send(userId, { content: dmContent });
        }

        if (action === 'cancel') {
            await interaction.message.delete();
            await interaction.reply({ content: '해당 주문을 취소 처리했습니다.', ephemeral: true });
            await client.users.send(userId, { content: '**❌ 귀하의 상품 주문이 취소되었습니다.**\n-# ⚡️AP | 에이피 베이프' });
        }
    }
  
    // 답변 모달 제출
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_reply_')) {
      const userId = interaction.customId.split('_')[2];
      const replyContent = interaction.fields.getTextInputValue('reply_content');
  
      await interaction.message.delete();
  
      await interaction.reply({
        content: '✅ 답변이 등록되었습니다.',
        ephemeral: true
      });
  
      await client.users.send(userId, {
        content: `**🟢 문의 답변이 등록됨**\n\n${replyContent}\n\n에이피 베이프를 이용해주시는 고객님, 감사합니다.`
      });
    }
});
  
client.login(process.env.TOKEN);

// ✅ Koyeb용 웹 서버 추가
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});