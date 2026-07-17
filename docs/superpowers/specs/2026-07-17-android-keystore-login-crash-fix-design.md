# Android Keystore 登录闪退修复设计

## 背景与证据

在 API 35 模拟器中使用真实生产账号登录后，应用进程稳定复现崩溃。`logcat -b crash` 的根异常为：

```text
java.security.InvalidAlgorithmParameterException: Caller-provided IV not permitted
    at com.chengxu.autoservice.core.auth.AesGcmSessionCipher.encrypt(SessionCipher.kt:25)
    at com.chengxu.autoservice.core.auth.EncryptedSessionStore.write(EncryptedSessionStore.kt:56)
    at com.chengxu.autoservice.core.auth.AuthenticationRepository.login(AuthenticationRepository.kt:39)
```

生产密钥由 AndroidKeyStore 生成，默认禁止调用方在加密时指定 IV。当前实现自行生成 12 字节 IV，并通过 `GCMParameterSpec` 传给 `Cipher.init(ENCRYPT_MODE, ...)`，因此真实 AndroidKeyStore 拒绝初始化。JVM 测试使用普通 `SecretKeySpec`，未覆盖该平台约束。

## 目标

- 登录成功后可以安全保存本地会话，不再崩溃。
- 保持 AES-256-GCM、非导出 AndroidKeyStore 密钥、随机 IV 和现有 `Base64(iv + ciphertext)` 数据格式。
- AndroidKeyStore 或持久化层出现其他异常时，登录流程返回未认证状态并显示可读错误，不让异常击穿主线程。
- 不记录密码、Token、密文或密钥信息。

## 方案

### 加密与解密

`AesGcmSessionCipher.encrypt` 只使用密钥初始化 `Cipher.ENCRYPT_MODE`，由密码服务提供者生成合规的随机 IV。完成初始化后读取 `cipher.iv`，校验其为 12 字节，再将 `iv + ciphertext` 进行 Base64 编码。

解密路径保持不变：从载荷前 12 字节读取 IV，并通过 `GCMParameterSpec` 初始化 `Cipher.DECRYPT_MODE`。因此存储格式不变，已有合法会话仍可恢复。

### 存储失败边界

`AuthenticationRepository.login` 在服务端认证成功后尝试写入会话。若写入抛出异常，仓库不发布 `Authenticated` 状态，清空公开会话并返回带“无法安全保存登录状态，请重试”消息的 `Unauthenticated` 状态。密码仍由登录页保留以便用户重试，不输出异常中的敏感数据。

## 测试策略

1. 先增加 Android 仪器测试，使用唯一测试别名创建真实 AndroidKeyStore 会话密码器，验证两次密文不同且均能解密；测试结束删除测试密钥。该测试在旧实现上必须以 `Caller-provided IV not permitted` 失败。
2. 先增加 JVM 仓库测试，令 `SessionStore.write` 抛出异常，验证应用保持未认证、公开会话为空且出现安全存储错误消息。该测试在旧实现上必须失败。
3. 最小实现后运行认证专属 JVM 测试、全量 JVM 测试、Android 仪器测试、Android 测试代码编译、Lint 和 Debug APK 构建。
4. 在模拟器中手工验证真实登录、进程不崩溃、重启恢复会话及退出登录。

## 非目标

- 不改变生产 API、账号契约、会话有效期或导航结构。
- 不迁移密文格式，不引入新的加密库。
- 不把底层异常详情直接显示给用户或写入日志。

