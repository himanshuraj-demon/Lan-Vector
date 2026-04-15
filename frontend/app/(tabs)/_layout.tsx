import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { tabs } from "@/constansts/data";
import { Text, View,Image } from "react-native";
import clsx from "clsx";
import { colors, components } from "@/constansts/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabbar = components.tabBar;
const TabsLayout = () => {
  const insests = useSafeAreaInsets();
  const Tabicon = ({ focused, icon }: TabIconProps) => {
    return (
      <View className="tabs-icon">
        <View className={clsx('tabs-pill', focused && 'tabs-active')}>
          <Image source={icon} className="tabs-glyph" />
        </View>
      </View>
    )
  };

  return (
    <>
      <StatusBar style="light" />
      <Tabs screenOptions={
        {
          headerShown: false,
          // tabBarShowLabel: false,

          tabBarStyle: {
            position: "absolute",
            bottom: Math.max(insests.bottom, tabbar.horizontalInset),
            height: tabbar.height,
            marginHorizontal: tabbar.horizontalInset,
            borderRadius: tabbar.radius,
            backgroundColor: "#151414",
            borderTopWidth: 1,
            elevation: 0,
            borderColor:"white",
            borderWidth:1
          },
          tabBarItemStyle: { paddingVertical: tabbar.height / 2 - tabbar.iconFrame / 1.4 },
          tabBarIconStyle: {
            height: tabbar.iconFrame,
            width: tabbar.iconFrame,
            justifyContent: "center",
            alignItems: "center",
          },
        }
      }>
        {tabs.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarIcon: ({ focused }) => (<Tabicon focused={focused} icon={tab.icon} />) }} />
        ))}
      </Tabs>
    </>
  )
}

export default TabsLayout;