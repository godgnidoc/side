# 创建dist服务专用用户
sudo useradd -r -s /sbin/nologin dist

# 为dist服务专用用户创建目录
sudo mkdir -p /home/dist

# 将dist服务专用用户赋予/home/dist目录的所有权
sudo chown -R dist:dist /home/dist

# 使用dist服务专用用户运行服务
sudo -u dist -s /bin/bash /home/dist/side dist serve